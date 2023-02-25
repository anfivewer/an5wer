import {ParsedLogLine} from '@-/types/src/logging/parsed-log';
import {
  PARSED_LINES_COLLECTION_NAME,
  PARSED_LINES_PER_DAY_COLLECTION_NAME,
  PARSED_LINES_PER_DAY_PARSED_LINES_READER_NAME,
} from '../database/structure';
import {AggregatedParsedLinesPerDayCollectionItem} from '../types/collections/parsed-lines-per-day';
import {
  AggregateInterval,
  createAggregateByTimestampTransform,
} from '@-/diffbelt-util/src/transform/aggregate-by-timestamp';
import {decrement, increment} from '@-/util/src/object/counter-record';
import {extractTimestampFromTimestampWithLoggerKey} from './helpers/extract-timestamp';
import {Context} from '../context/types';
import {toString} from '@-/diffbelt-util/src/keys/encoding';

export const aggregateParsedLinesPerDay = createAggregateByTimestampTransform<
  Context,
  ParsedLogLine,
  AggregatedParsedLinesPerDayCollectionItem,
  {mergedLogKey: string},
  AggregatedParsedLinesPerDayCollectionItem
>({
  interval: AggregateInterval.DAY,
  targetCollectionName: PARSED_LINES_PER_DAY_COLLECTION_NAME,
  sourceCollectionName: PARSED_LINES_COLLECTION_NAME,
  targetFromSourceReaderName: PARSED_LINES_PER_DAY_PARSED_LINES_READER_NAME,
  parseSourceItem: (value) => ParsedLogLine.parse(JSON.parse(toString(value))),
  parseTargetItem: (value) =>
    AggregatedParsedLinesPerDayCollectionItem.parse(
      JSON.parse(toString(value)),
    ),
  serializeTargetItem: (item) => ({value: JSON.stringify(item)}),
  getTimestampMs: (key) =>
    extractTimestampFromTimestampWithLoggerKey(toString(key)),
  extractContext: ({database, logger}) => ({
    database: database.getDiffbelt(),
    logger,
  }),
  mapFilter: ({sourceItem}) => {
    if (!sourceItem) {
      return null;
    }

    const {logLevelLetter, loggerKey, logKey} = sourceItem;

    // Remove pid from logger key
    const unifiedLoggerKey = loggerKey.replace(/^(master|worker)\d+/, '$1#');
    const mergedLogKey = `${unifiedLoggerKey}::${logKey}::${logLevelLetter}`;

    return {mergedLogKey};
  },
  parallelReduceWithInitialAccumulator: ({accumulator, items}) => {
    items.forEach(({prev, next}) => {
      if (prev) {
        accumulator.count--;
        decrement(accumulator.logKeys, prev.mergedLogKey);
      }
      if (next) {
        accumulator.count++;
        increment(accumulator.logKeys, next.mergedLogKey);
      }
    });

    return accumulator;
  },
  getInitialAccumulator: ({prevTargetItem}) =>
    prevTargetItem || {count: 0, logKeys: {}},
  getEmptyAccumulator: () => ({count: 0, logKeys: {}}),
  merge: ({items}) => {
    return items.reduce((acc, {count, logKeys}) => {
      acc.count += count;

      for (const [logKey, count] of Object.entries(logKeys)) {
        if (typeof count !== 'number') {
          continue;
        }

        increment(acc.logKeys, logKey, count);
      }

      return acc;
    });
  },
  apply: ({mergedItem}) => {
    return mergedItem;
  },
});
