import {EncodedValue} from '@-/diffbelt-types/src/database/types';
import {getIntervalTsMs} from '@-/diffbelt-util/src/intervals/get-interval-ts';
import {toString} from '@-/diffbelt-util/src/keys/encoding';
import {AggregateInterval} from '@-/diffbelt-util/src/transform/types';
import {createUniqueCounterTransform} from '@-/diffbelt-util/src/transform/unique-counter';
import {LogLevel} from '@-/types/src/logging/logging';
import {ParsedLogLine} from '@-/types/src/logging/parsed-log';
import {Context} from '../context/types';
import {
  CollectionsWithIntermediateDef,
  UNIQUE_CHATS_COLLECTIONS_DEF,
  UNIQUE_USERS_COLLECTIONS_DEF,
} from '../database/structure';
import {extractTimestampFromTimestampWithLoggerKey} from './helpers/extract-timestamp';

const createUniqueCountTransform = <SourceItem>({
  collectionsDef: {
    sourceCollectionName,
    intermediateCollectionName,
    intermediateToSourceReaderName,
    targetCollectionName,
    targetToIntermediateReaderName,
  },
  parseSourceItem,
  getIdFromSourceItem,
}: {
  collectionsDef: CollectionsWithIntermediateDef;
  parseSourceItem: (value: EncodedValue) => SourceItem;
  getIdFromSourceItem: (item: SourceItem) => string | null;
}) => {
  return createUniqueCounterTransform({
    interval: AggregateInterval.DAY,
    extractContext: ({database, logger}: Context) => ({
      database: database.getDiffbelt(),
      logger,
    }),
    sourceCollectionName,
    intermediateCollectionName,
    intermediateToSourceReaderName,
    targetCollectionName,
    targetToIntermediateReaderName,
    parseSourceItem,
    parseIntermediateItem: () => '',
    serializeIntermediateItem: () => ({value: ''}),
    parseTargetItem: (value) => parseInt(toString(value), 10),
    serializeTargetItem: (count) => ({value: String(count)}),
    getIntermediateFromSource: ({key, sourceItem}) => {
      const id = getIdFromSourceItem(sourceItem);
      if (id === null) {
        return null;
      }

      const timestampMs = extractTimestampFromTimestampWithLoggerKey(
        toString(key),
      );
      const intervalTsMs = getIntervalTsMs({
        interval: AggregateInterval.DAY,
        timestampMs,
      });

      return {
        key: {value: `${new Date(intervalTsMs).toISOString()} ${id}`},
        value: '',
      };
    },
    getIntermediateTimestampMsFromKey: (key) =>
      extractTimestampFromTimestampWithLoggerKey(toString(key)),
    getInitialIntermediateAccumulator: () => 0,
    getEmptyIntermediateAccumulator: () => 0,
    reduceIntermediateWithInitialAccumulator: ({accumulator}) => {
      return accumulator;
    },
    mergeIntermediate: () => {
      return 0;
    },
    applyDiffToTargetItem: ({prevTargetItem, countDiff}) => {
      if (prevTargetItem === null) {
        return countDiff;
      }

      return prevTargetItem + countDiff;
    },
  });
};

export const calculateUniqueChats = createUniqueCountTransform({
  collectionsDef: UNIQUE_CHATS_COLLECTIONS_DEF,
  parseSourceItem: (value) => ParsedLogLine.parse(JSON.parse(toString(value))),
  getIdFromSourceItem: (item) => {
    // S 2022-11-13T04:32:41.054Z.000 master258651:uniqueChats chat id:?????????
    const isOurLine =
      item.logLevel === LogLevel.STATS &&
      item.logKey === 'chat' &&
      /^[^:]+:uniqueChats$/.test(item.loggerKey);

    if (!isOurLine) {
      return null;
    }

    const id = item.props.id;

    return id ?? null;
  },
});

export const calculateUniqueUsers = createUniqueCountTransform({
  collectionsDef: UNIQUE_USERS_COLLECTIONS_DEF,
  parseSourceItem: (value) => ParsedLogLine.parse(JSON.parse(toString(value))),
  getIdFromSourceItem: (item) => {
    // S 2022-11-13T04:38:32.067Z.000 master258651:uniqueUsers user id:?????????
    const isOurLine =
      item.logLevel === LogLevel.STATS &&
      item.logKey === 'user' &&
      /^[^:]+:uniqueUsers$/.test(item.loggerKey);

    if (!isOurLine) {
      return null;
    }

    const id = item.props.id;

    return id ?? null;
  },
});
