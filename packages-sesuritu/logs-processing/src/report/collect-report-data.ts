import {
  ReportData,
  ReportType,
  SimpleTimeMetric,
} from '@-/sesuritu-types/src/site/report/report';
import {Context} from '../context/types';
import {
  KICKS_PER_DAY_COLLECTION_NAME,
  PARSED_LINES_PER_DAY_COLLECTION_NAME,
} from '../database/structure';
import {queryCollection} from '@-/diffbelt-util/src/queries/dump';
import {AggregatedKicksCollectionItem} from '../types/collections/kicks';
import {extractTimestampFromTimestampWithLoggerKey} from '../transforms/helpers/extract-timestamp';
import {PieCollector} from './helpers/pie-collector';
import {AggregatedParsedLinesPerDayCollectionItem} from '../types/collections/parsed-lines-per-day';

export const collectReportData = async ({
  context,
}: {
  context: Context;
}): Promise<ReportData> => {
  const {database} = context;
  const diffbelt = database.getDiffbelt();

  const collectCountMetric = async <T extends {count: number}>({
    metricName,
    collectionName,
    itemParser,
    onItem,
  }: {
    metricName: string;
    collectionName: string;
    itemParser: {parse: (value: unknown) => T};
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
      for (const {key, value} of items) {
        const tsMs = extractTimestampFromTimestampWithLoggerKey(key);
        const item = itemParser.parse(JSON.parse(value));

        onItem?.({key, item, tsMs});

        metricItems.push({tsMs, value: item.count});
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
      metricName: 'kicks:1d',
      collectionName: KICKS_PER_DAY_COLLECTION_NAME,
      itemParser: AggregatedKicksCollectionItem,
      onItem: ({tsMs, item}) => {
        kicksPerDayReasonsMetricCollector.addItem({tsMs, item});
      },
    }),
    collectCountMetric({
      metricName: 'parsed-log-lines:1d',
      collectionName: PARSED_LINES_PER_DAY_COLLECTION_NAME,
      itemParser: AggregatedParsedLinesPerDayCollectionItem,
      onItem: ({tsMs, item}) => {
        logsPerDayLogKeysMetricCollector.addItem({tsMs, item});
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
