import {getIntervalTsMs} from '@-/diffbelt-util/src/intervals/get-interval-ts';
import {toString} from '@-/diffbelt-util/src/keys/encoding';
import {createPercentilesTransform} from '@-/diffbelt-util/src/transform/percentiles';
import {AggregateInterval} from '@-/diffbelt-util/src/transform/types';
import {LogLevel} from '@-/types/src/logging/logging';
import {ParsedLogLine} from '@-/types/src/logging/parsed-log';
import {decrement, increment} from '@-/util/src/object/counter-record';
import {Context} from '../context/types';
import {
  HANDLE_UPDATE_PER_DAY_COLLECTION_NAME,
  HANDLE_UPDATE_PER_DAY_PARSED_LINES_READER_NAME,
  HANDLE_UPDATE_PER_DAY_PERCENTILES_COLLECTION_NAME,
  HANDLE_UPDATE_PER_DAY_PERCENTILES_READER_NAME,
  PARSED_LINES_COLLECTION_NAME,
} from '../database/structure';
import {
  UpdateHandleIntermediateItem,
  UpdateHandleTargetItem,
} from '../types/collections/update-handle';
import {extractTimestampFromTimestampWithLoggerKey} from './helpers/extract-timestamp';

export const UPDATE_HANDLE_PERCENTILES = [0, 50, 75, 90, 95, 100];

export const aggregateUpdatesHandlingPerDay = createPercentilesTransform({
  interval: AggregateInterval.DAY,
  percentiles: UPDATE_HANDLE_PERCENTILES,
  extractContext: ({database, logger}: Context) => ({
    database: database.getDiffbelt(),
    logger,
  }),
  sourceCollectionName: PARSED_LINES_COLLECTION_NAME,
  intermediateCollectionName: HANDLE_UPDATE_PER_DAY_COLLECTION_NAME,
  intermediateToSourceReaderName:
    HANDLE_UPDATE_PER_DAY_PARSED_LINES_READER_NAME,
  targetCollectionName: HANDLE_UPDATE_PER_DAY_PERCENTILES_COLLECTION_NAME,
  targetToIntermediateReaderName: HANDLE_UPDATE_PER_DAY_PERCENTILES_READER_NAME,
  parseSourceItem: (value) => ParsedLogLine.parse(JSON.parse(toString(value))),
  parseIntermediateItem: (value) =>
    UpdateHandleIntermediateItem.parse(JSON.parse(toString(value))),
  serializeIntermediateItem: (item) => ({value: JSON.stringify(item)}),
  parseTargetItem: (value) =>
    UpdateHandleTargetItem.parse(JSON.parse(toString(value))),
  serializeTargetItem: (item) => ({value: JSON.stringify(item)}),
  extractPercentilesDataFromTargetItem: (item) => item.percentilesData,
  getIntermediateFromSource: ({key: encodedKey, sourceItem}) => {
    const isOurLog =
      sourceItem.logLevel === LogLevel.STATS &&
      sourceItem.logKey === 'handleFull' &&
      /^worker\d*:middlewares$/.test(sourceItem.loggerKey);

    if (!isOurLog) {
      return null;
    }

    const {updateType, ms: msStr} = sourceItem.props;

    if (typeof msStr !== 'string') {
      return null;
    }

    const ms = parseFloat(msStr);
    if (!isFinite(ms) || ms < 0) {
      return null;
    }

    let msFixed = ms > 999999999 ? '999999999.9' : ms.toFixed(1);
    if (/e\+\d+$/.test(msFixed)) {
      msFixed = '999999999.9';
    }

    msFixed = msFixed.padStart(11, '0');

    if (msFixed.length !== 11) {
      throw new Error(`msFixed.length !== 11, ms: ${ms}, msFixed: ${msFixed}`);
    }

    const key = toString(encodedKey);

    const timestampMs = extractTimestampFromTimestampWithLoggerKey(key);
    const intervalTsMs = getIntervalTsMs({
      interval: AggregateInterval.DAY,
      timestampMs,
    });

    return {
      key: {value: `${new Date(intervalTsMs).toISOString()} ${msFixed} ${key}`},
      value: {
        updateType: updateType ?? '???',
        ms,
      },
    };
  },
  getIntermediateTimestampMsFromKey: (key) =>
    extractTimestampFromTimestampWithLoggerKey(toString(key)),
  getInitialIntermediateAccumulator: ({prevTargetItem}) =>
    prevTargetItem !== null
      ? {sumMs: prevTargetItem.sumMs, msByType: prevTargetItem.msByType}
      : {sumMs: 0, msByType: {}},
  reduceIntermediate: ({accumulator, items}) => {
    items.forEach(({prev, next}) => {
      if (prev !== null) {
        accumulator.sumMs -= prev.ms;
        decrement(accumulator.msByType, prev.updateType);
      }
      if (next !== null) {
        accumulator.sumMs += next.ms;
        increment(accumulator.msByType, next.updateType);
      }
    });

    return accumulator;
  },
  apply: ({reducedItem, percentilesData}) => {
    return {
      ...reducedItem,
      percentilesData,
    };
  },
});
