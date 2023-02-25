import {Database, EncodedValue} from '@-/diffbelt-types/src/database/types';
import {Logger} from '@-/types/src/logging/logging';
import {createAggregateByTimestampTransform} from './aggregate-by-timestamp';
import {createMapFilterTransform} from './map-filter';
import {AggregateInterval, ItemChange} from './types';
import {PercentilesData} from '@-/diffbelt-types/src/transform/percentiles';
import {PercentilesState} from './percentiles-state';

type PercentilesTransformOptions<
  Context,
  SourceItem,
  IntermediateItem,
  ReducedItem,
  TargetItem,
> = {
  interval: AggregateInterval;
  extractContext: (context: Context) => {database: Database; logger: Logger};

  sourceCollectionName: string;
  intermediateCollectionName: string;
  intermediateToSourceReaderName: string;
  targetCollectionName: string;
  targetToIntermediateReaderName: string;

  /** Specified in percents, like [0, 50, 75, 90, 95, 100] */
  percentiles: number[];

  parseSourceItem: (value: EncodedValue) => SourceItem;
  parseIntermediateItem: (value: EncodedValue) => IntermediateItem;
  serializeIntermediateItem: (item: IntermediateItem) => EncodedValue;
  parseTargetItem: (value: EncodedValue) => TargetItem;
  serializeTargetItem: (item: TargetItem) => EncodedValue;

  extractPercentilesDataFromTargetItem: (item: TargetItem) => PercentilesData;

  getIntermediateFromSource: (options: {
    key: EncodedValue;
    sourceItem: SourceItem;
  }) => {
    key: EncodedValue;
    value: IntermediateItem | null;
  } | null;
  getIntermediateTimestampMsFromKey: (key: EncodedValue) => number;
  getTargetKeyFromTimestampMs?: (timestampMs: number) => EncodedValue;

  getInitialIntermediateAccumulator: (options: {
    prevTargetItem: TargetItem | null;
  }) => ReducedItem;

  reduceIntermediate: (options: {
    accumulator: ReducedItem;
    items: ItemChange<IntermediateItem>[];
  }) => ReducedItem;

  apply: (options: {
    prevTargetItem: TargetItem | null;
    reducedItem: ReducedItem;
    percentilesData: PercentilesData;
  }) => TargetItem | null;
};

export const createPercentilesTransform = <
  Context,
  SourceItem,
  IntermediateItem,
  ReducedItem,
  TargetItem,
>({
  interval,
  extractContext,
  sourceCollectionName,
  intermediateCollectionName,
  intermediateToSourceReaderName,
  targetCollectionName,
  targetToIntermediateReaderName,
  percentiles,
  parseSourceItem,
  parseIntermediateItem,
  serializeIntermediateItem,
  parseTargetItem,
  serializeTargetItem,
  extractPercentilesDataFromTargetItem,
  getIntermediateFromSource,
  getIntermediateTimestampMsFromKey,
  getTargetKeyFromTimestampMs,
  getInitialIntermediateAccumulator,
  reduceIntermediate,
  apply,
}: PercentilesTransformOptions<
  Context,
  SourceItem,
  IntermediateItem,
  ReducedItem,
  TargetItem
>) => {
  const mapFilterTransform = createMapFilterTransform({
    sourceCollectionName,
    targetCollectionName: intermediateCollectionName,
    targetCollectionReaderName: intermediateToSourceReaderName,
    parseSourceCollectionItem: parseSourceItem,
    getDatabaseFromContext: (context: Context) =>
      extractContext(context).database,
    mapFilter: ({key, value}) => {
      const intermediateItem = getIntermediateFromSource({
        key,
        sourceItem: value,
      });

      if (intermediateItem === null) {
        return null;
      }

      const {key: intermediateKey, value: intermediateValue} = intermediateItem;
      return {
        key: intermediateKey,
        value:
          intermediateValue !== null
            ? serializeIntermediateItem(intermediateValue)
            : null,
      };
    },
  });

  const aggregateTransform = createAggregateByTimestampTransform<
    Context,
    IntermediateItem,
    TargetItem,
    IntermediateItem,
    ReducedItem,
    PercentilesState
  >({
    interval,
    targetCollectionName,
    sourceCollectionName: intermediateCollectionName,
    targetFromSourceReaderName: targetToIntermediateReaderName,
    parseSourceItem: parseIntermediateItem,
    parseTargetItem: parseTargetItem,
    serializeTargetItem,
    getTimestampMs: getIntermediateTimestampMsFromKey,
    getTargetKey: getTargetKeyFromTimestampMs,
    extractContext,
    mapFilter: ({sourceItem}) => {
      return sourceItem;
    },
    sequentalReduceWithInitialAccumulator: async ({
      accumulator,
      items,
      state,
    }) => {
      const reduced = reduceIntermediate({accumulator, items});

      for (const {key, prev, next} of items) {
        const needFetch = (() => {
          if (prev === null && next !== null) {
            return state.keyAdded(key);
          } else if (prev !== null && next === null) {
            return state.keyRemoved(key);
          }

          return false;
        })();

        if (needFetch) {
          await state.fetchAround();
        }
      }

      return reduced;
    },
    getIntervalState: async ({prevTargetItem, fromGenerationId, context}) => {
      const {database} = extractContext(context);

      const collection = await database.getCollection(
        intermediateCollectionName,
      );

      const state = new PercentilesState({
        percentiles,
        percentilesData:
          prevTargetItem !== null
            ? extractPercentilesDataFromTargetItem(prevTargetItem)
            : undefined,
        collection,
        fromGenerationId,
      });

      await state.fetchAround();

      return state;
    },
    getInitialAccumulator: ({prevTargetItem}) =>
      getInitialIntermediateAccumulator({prevTargetItem}),
    applyWithState: ({prevTargetItem, mergedItem, state}) => {
      const percentilesData = state.getPercentilesData();

      if (percentilesData.count <= 0) {
        return null;
      }

      return apply({
        prevTargetItem,
        reducedItem: mergedItem,
        percentilesData,
      });
    },
  });

  return async ({context}: {context: Context}) => {
    await mapFilterTransform({context});
    await aggregateTransform({context});
  };
};
