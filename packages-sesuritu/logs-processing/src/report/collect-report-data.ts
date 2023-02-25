import {
  PercentileMetric,
  ReportData,
  ReportType,
  SimpleTimeMetric,
} from '@-/sesuritu-types/src/site/report/report';
import {Context} from '../context/types';
import {
  HANDLE_UPDATE_PER_DAY_PERCENTILES_COLLECTION_NAME,
  KICKS_PER_DAY_COLLECTION_NAME,
  PARSED_LINES_PER_DAY_COLLECTION_NAME,
  UNIQUE_CHATS_COLLECTIONS_DEF,
  UNIQUE_USERS_COLLECTIONS_DEF,
} from '../database/structure';
import {queryCollection} from '@-/diffbelt-util/src/queries/dump';
import {AggregatedKicksCollectionItem} from '../types/collections/kicks';
import {extractTimestampFromTimestampWithLoggerKey} from '../transforms/helpers/extract-timestamp';
import {PieCollector} from './helpers/pie-collector';
import {AggregatedParsedLinesPerDayCollectionItem} from '../types/collections/parsed-lines-per-day';
import {PercentilesData} from '@-/diffbelt-types/src/transform/percentiles';
import {UpdateHandleTargetItem} from '../types/collections/update-handle';
import {UPDATE_HANDLE_PERCENTILES} from '../transforms/update-handle';
import {toString} from '@-/diffbelt-util/src/keys/encoding';
import {EncodedValue} from '@-/diffbelt-types/src/database/types';

export const collectReportData = async ({
  context,
}: {
  context: Context;
}): Promise<ReportData> => {
  const {database} = context;
  const diffbelt = database.getDiffbelt();

  const collectCountMetric = async <T>({
    metricName,
    collectionName,
    itemParser,
    getCount,
    onItem,
  }: {
    metricName: string;
    collectionName: string;
    itemParser: {parse: (value: unknown) => T};
    getCount: (item: T) => number;
    onItem?: (options: {key: string; tsMs: number; item: T}) => void;
  }) => {
    const metric: SimpleTimeMetric = {
      type: ReportType.simpleTimeMetric,
      name: metricName,
      data: [],
    };
    const metricItems = metric.data;

    const collection = await diffbelt.getCollection(collectionName);

    const {stream} = await queryCollection(collection);

    for await (const items of stream) {
      for (const {key: encodedKey, value} of items) {
        const key = toString(encodedKey);

        const tsMs = extractTimestampFromTimestampWithLoggerKey(key);
        const item = itemParser.parse(JSON.parse(toString(value)));

        onItem?.({key, item, tsMs});

        metricItems.push({tsMs, value: getCount(item)});
      }
    }

    return metric;
  };

  const collectPercentileMetric = async <T>({
    metricName,
    collectionName,
    percentiles,
    itemParser,
    getPercentilesData,
    getValueFromKey,
    onItem,
  }: {
    metricName: string;
    collectionName: string;
    percentiles: number[];
    itemParser: {parse: (value: unknown) => T};
    getPercentilesData: (item: T) => PercentilesData;
    getValueFromKey: (key: EncodedValue) => number;
    onItem?: (options: {key: EncodedValue; tsMs: number; item: T}) => void;
  }) => {
    const metric: PercentileMetric = {
      type: ReportType.percentileMetric,
      name: metricName,
      percentiles,
      data: [],
    };
    const metricItems = metric.data;

    const collection = await diffbelt.getCollection(collectionName);

    const {stream} = await queryCollection(collection);

    for await (const items of stream) {
      for (const {key: encodedKey, value} of items) {
        const key = toString(encodedKey);

        const tsMs = extractTimestampFromTimestampWithLoggerKey(key);
        const item = itemParser.parse(JSON.parse(toString(value)));
        const {count, percentiles: percentilesFromData} =
          getPercentilesData(item);

        onItem?.({key: encodedKey, item, tsMs});

        let percentileIndex = 0;
        const values = percentiles.map((bigP) => {
          while (true) {
            if (percentileIndex >= percentilesFromData.length) {
              return NaN;
            }

            const obj = percentilesFromData[percentileIndex];
            percentileIndex++;

            if (Math.abs(obj.p * 100 - bigP) > 0.5) {
              continue;
            }

            return getValueFromKey(obj.key);
          }
        });

        metricItems.push({tsMs, count, values});
      }
    }

    return metric;
  };

  const kicksPerDayReasonsMetricCollector =
    new PieCollector<AggregatedKicksCollectionItem>({
      name: 'kicks:1d:reasons',
      extractCategories: ({item: {reasons}, addCategory}) => {
        for (const [key, value] of Object.entries(reasons)) {
          addCategory(key, value ?? 0);
        }
      },
      extractCategoryCount: ({reasons}, key) => {
        return reasons[key] ?? 0;
      },
    });

  const logsPerDayLogKeysMetricCollector =
    new PieCollector<AggregatedParsedLinesPerDayCollectionItem>({
      name: 'parsed-log-lines:1d:log-keys',
      extractCategories: ({item: {logKeys}, addCategory}) => {
        for (const [key, value] of Object.entries(logKeys)) {
          addCategory(key, value ?? 0);
        }
      },
      extractCategoryCount: ({logKeys}, key) => {
        return logKeys[key] ?? 0;
      },
    });

  const reports: ReportData['reports'] = await Promise.all([
    collectCountMetric({
      metricName: 'uniqueChats:1d',
      collectionName: UNIQUE_CHATS_COLLECTIONS_DEF.targetCollectionName,
      itemParser: {
        parse: (value) => {
          if (typeof value !== 'number') {
            throw new Error();
          }

          return value;
        },
      },
      getCount: (count) => count,
    }),
    collectCountMetric({
      metricName: 'uniqueUsers:1d',
      collectionName: UNIQUE_USERS_COLLECTIONS_DEF.targetCollectionName,
      itemParser: {
        parse: (value) => {
          if (typeof value !== 'number') {
            throw new Error();
          }

          return value;
        },
      },
      getCount: (count) => count,
    }),
    collectCountMetric({
      metricName: 'kicks:1d',
      collectionName: KICKS_PER_DAY_COLLECTION_NAME,
      itemParser: AggregatedKicksCollectionItem,
      getCount: (item) => item.count,
      onItem: ({tsMs, item}) => {
        kicksPerDayReasonsMetricCollector.addItem({tsMs, item});
      },
    }),
    collectCountMetric({
      metricName: 'parsed-log-lines:1d',
      collectionName: PARSED_LINES_PER_DAY_COLLECTION_NAME,
      itemParser: AggregatedParsedLinesPerDayCollectionItem,
      getCount: (item) => item.count,
      onItem: ({tsMs, item}) => {
        logsPerDayLogKeysMetricCollector.addItem({tsMs, item});
      },
    }),
    collectPercentileMetric({
      metricName: 'update-handle:1d:p',
      collectionName: HANDLE_UPDATE_PER_DAY_PERCENTILES_COLLECTION_NAME,
      itemParser: UpdateHandleTargetItem,
      percentiles: UPDATE_HANDLE_PERCENTILES,
      getPercentilesData: ({percentilesData}) => percentilesData,
      getValueFromKey: (key) => {
        const match = /^[^\s]+\s(\d+\.\d+)\s/.exec(toString(key));
        if (!match) {
          return NaN;
        }

        return parseFloat(match[1]);
      },
    }),
  ]);

  reports.push(kicksPerDayReasonsMetricCollector.getMetric());
  reports.push(logsPerDayLogKeysMetricCollector.getMetric());

  reports.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return {
    reports,
  };
};
