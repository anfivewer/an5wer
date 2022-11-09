import {
  PieTimeMetric,
  ReportData,
  ReportType,
  SimpleTimeMetric,
} from '@-/sesuritu-types/src/site/report/report';
import {Context} from '../context/types';
import {KICKS_PER_DAY_COLLECTION_NAME} from '../database/structure';
import {queryCollection} from '@-/diffbelt-server/src/util/database/queries/dump';
import {AggregatedKicksCollectionItem} from '../types/collections/kicks';
import {extractTimestampFromTimestampWithLoggerKey} from '../transforms/helpers/extract-timestamp';

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

  const kicksPerDayReasonsMetric: PieTimeMetric = {
    type: ReportType.pieTimeMetric,
    name: 'kicks:1d:reasons',
    keys: [],
    data: [],
  };

  // We will need to sort them from higher to lower
  const kicksPerDayReasonsMetricKeysObj: Record<string, number> = {};
  const kicksPerDayReasonsMetricData = kicksPerDayReasonsMetric.data;

  const kicksPerDayItems: {
    tsMs: number;
    item: AggregatedKicksCollectionItem;
  }[] = [];

  const reports: ReportData['reports'] = await Promise.all([
    collectCountMetric({
      metricName: 'kicks:1d',
      collectionName: KICKS_PER_DAY_COLLECTION_NAME,
      itemParser: AggregatedKicksCollectionItem,
      onItem: ({tsMs, item}) => {
        kicksPerDayItems.push({tsMs, item});

        for (const [key, value] of Object.entries(item.reasons)) {
          let n = kicksPerDayReasonsMetricKeysObj[key];
          if (typeof n !== 'number') {
            n = 0;
          }

          n += value ?? 0;

          kicksPerDayReasonsMetricKeysObj[key] = n;
        }
      },
    }),
  ]);

  const keysList = Object.entries(kicksPerDayReasonsMetricKeysObj);
  keysList.sort(([, a], [, b]) => b - a);

  keysList.forEach(([key]) => {
    kicksPerDayReasonsMetric.keys.push(key);
  });

  kicksPerDayItems.forEach(({tsMs, item}) => {
    kicksPerDayReasonsMetricData.push({
      tsMs,
      values: kicksPerDayReasonsMetric.keys.map((key) => {
        return item.reasons[key] ?? 0;
      }),
    });
  });

  reports.push(kicksPerDayReasonsMetric);

  return {
    reports,
  };
};
