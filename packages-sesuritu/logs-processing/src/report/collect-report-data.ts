import {
  ReportData,
  ReportType,
  SimpleTimeMetric,
} from '@-/sesuritu-types/src/site/report/report';
import {Context} from '../context/types';
import {
  KICKS_PER_DAY_COLLECTION_NAME,
  KICKS_PER_HOUR_COLLECTION_NAME,
} from '../database/structure';
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
  }: {
    metricName: string;
    collectionName: string;
    itemParser: {parse: (value: unknown) => T};
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

        metricItems.push({tsMs, value: item.count});
      }
    }

    return metric;
  };

  const reports = await Promise.all([
    collectCountMetric({
      metricName: 'kicks:1h',
      collectionName: KICKS_PER_HOUR_COLLECTION_NAME,
      itemParser: AggregatedKicksCollectionItem,
    }),
    collectCountMetric({
      metricName: 'kicks:1d',
      collectionName: KICKS_PER_DAY_COLLECTION_NAME,
      itemParser: AggregatedKicksCollectionItem,
    }),
  ]);

  return {
    reports,
  };
};
