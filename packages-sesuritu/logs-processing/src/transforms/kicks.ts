import {
  KICKS_COLLECTION_NAME,
  KICKS_PARSED_LINES_READER_NAME,
  KICKS_PER_DAY_COLLECTION_NAME,
  KICKS_PER_DAY_KICKS_READER_NAME,
  KICKS_PER_HOUR_COLLECTION_NAME,
  KICKS_PER_HOUR_KICKS_READER_NAME,
} from '../database/structure';
import {
  AggregatedKicksCollectionItem,
  KicksCollectionItem,
} from '../types/collections/kicks';
import {
  AggregateInterval,
  createAggregateByTimestampTransform,
} from './helpers/aggregate-by-timestamp';
import {extractTimestampFromTimestampWithLoggerKey} from './helpers/extract-timestamp';
import {createParsedLinesFilterTransform} from './helpers/filter-parsed-lines';

export const transformParsedLinesToKicks = createParsedLinesFilterTransform({
  targetCollectionName: KICKS_COLLECTION_NAME,
  parsedLinesReaderName: KICKS_PARSED_LINES_READER_NAME,
  mapFilter: ({key, line: {logKey, props}}) => {
    if (logKey !== 'kick') {
      return null;
    }

    const {reason, chatId, userId} = props;

    if (!reason || !chatId || !userId) {
      return null;
    }

    const value: KicksCollectionItem = {
      reason,
      chatId,
      userId,
    };

    return {key, value: JSON.stringify(value)};
  },
});

export const aggregateKicksPerHour = createAggregateByTimestampTransform<
  KicksCollectionItem,
  AggregatedKicksCollectionItem,
  {reason: string},
  {count: number; reasons: Record<string, number | undefined>}
>({
  interval: AggregateInterval.HOUR,
  targetCollectionName: KICKS_PER_HOUR_COLLECTION_NAME,
  sourceCollectionName: KICKS_COLLECTION_NAME,
  targetFromSourceReaderName: KICKS_PER_HOUR_KICKS_READER_NAME,
  parseSourceItem: (value) => KicksCollectionItem.parse(JSON.parse(value)),
  parseTargetItem: (value) =>
    AggregatedKicksCollectionItem.parse(JSON.parse(value)),
  serializeTargetItem: (item) => JSON.stringify(item),
  getTimestampMs: extractTimestampFromTimestampWithLoggerKey,
  mapFilter: ({sourceItem}) => {
    if (!sourceItem) {
      return null;
    }

    return {reason: sourceItem.reason};
  },
  parallelReduceWithInitialAccumulator: ({accumulator, items}) => {
    accumulator.count += items.length;

    items.forEach(({prev, next}) => {
      if (prev) {
        decrement(accumulator.reasons, prev.reason);
      }
      if (next) {
        increment(accumulator.reasons, next.reason);
      }
    });

    return accumulator;
  },
  getInitialAccumulator: ({prevTargetItem}) =>
    prevTargetItem || {count: 0, reasons: {}},
  merge: ({items}) => {
    return items.reduce((acc, {count, reasons}) => {
      acc.count += count;

      for (const [reason, count] of Object.entries(reasons)) {
        if (!count) {
          continue;
        }

        increment(acc.reasons, reason, count);
      }

      return acc;
    });
  },
  apply: ({mergedItem}) => {
    return mergedItem;
  },
});

export const aggregateKicksPerDay = createAggregateKicksMoreThanHour({
  interval: AggregateInterval.DAY,
  targetCollectionName: KICKS_PER_DAY_COLLECTION_NAME,
  sourceCollectionName: KICKS_PER_HOUR_COLLECTION_NAME,
  targetFromSourceReaderName: KICKS_PER_DAY_KICKS_READER_NAME,
});

function createAggregateKicksMoreThanHour({
  interval,
  targetCollectionName,
  sourceCollectionName,
  targetFromSourceReaderName,
}: {
  interval: AggregateInterval;
  targetCollectionName: string;
  sourceCollectionName: string;
  targetFromSourceReaderName: string;
}) {
  const merge = (
    accumulator: AggregatedKicksCollectionItem,
    items: AggregatedKicksCollectionItem[],
  ) => {
    return items.reduce((acc, {count, reasons}) => {
      acc.count += count;

      for (const [reason, count] of Object.entries(reasons)) {
        if (!count) {
          continue;
        }

        increment(acc.reasons, reason, count);
      }

      return acc;
    }, accumulator);
  };

  return createAggregateByTimestampTransform<
    AggregatedKicksCollectionItem,
    AggregatedKicksCollectionItem,
    AggregatedKicksCollectionItem,
    AggregatedKicksCollectionItem
  >({
    interval,
    targetCollectionName,
    sourceCollectionName,
    targetFromSourceReaderName,
    parseSourceItem: (value) =>
      AggregatedKicksCollectionItem.parse(JSON.parse(value)),
    parseTargetItem: (value) =>
      AggregatedKicksCollectionItem.parse(JSON.parse(value)),
    serializeTargetItem: (item) => JSON.stringify(item),
    getTimestampMs: extractTimestampFromTimestampWithLoggerKey,
    mapFilter: ({sourceItem}) => {
      return sourceItem;
    },
    parallelReduceWithInitialAccumulator: ({accumulator, items}) => {
      const newItems: AggregatedKicksCollectionItem[] = [];

      items.forEach(({prev, next}) => {
        if (prev) {
          const negativeReasons: Record<string, number | undefined> = {};

          for (const [reason, count] of Object.entries(prev.reasons)) {
            if (typeof count !== 'number') {
              continue;
            }

            negativeReasons[reason] = -count;
          }

          newItems.push({count: -prev.count, reasons: negativeReasons});
        }
        if (next) {
          newItems.push(next);
        }
      });

      return merge(accumulator, newItems);
    },
    getInitialAccumulator: ({prevTargetItem}) =>
      prevTargetItem || {count: 0, reasons: {}},
    merge: ({items}) => {
      return merge({count: 0, reasons: {}}, items);
    },
    apply: ({mergedItem}) => {
      return mergedItem;
    },
  });
}

const increment = (
  record: Record<string, number | undefined>,
  key: string,
  amount = 1,
): void => {
  let count = record[key];

  if (typeof count === 'number') {
    count += amount;
  } else {
    count = amount;
  }

  record[key] = count;
};
const decrement = (
  record: Record<string, number | undefined>,
  key: string,
): void => {
  let count = record[key];

  if (typeof count === 'number') {
    count -= 1;
  } else {
    count = -1;
  }

  record[key] = count;
};