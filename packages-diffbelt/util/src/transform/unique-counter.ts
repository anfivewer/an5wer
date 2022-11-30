import {Database} from '@-/diffbelt-types/src/database/types';
import {Logger} from '@-/types/src/logging/logging';
import {createAggregateByTimestampTransform} from './aggregate-by-timestamp';
import {createMapFilterTransform} from './map-filter';
import {AggregateInterval, ItemChange} from './types';

type UniqueCounterTransformOptions<
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

  parseSourceItem: (value: string) => SourceItem;
  parseIntermediateItem: (value: string) => IntermediateItem;
  serializeIntermediateItem: (item: IntermediateItem) => string;
  parseTargetItem: (value: string) => TargetItem;
  serializeTargetItem: (item: TargetItem) => string;

  getIntermediateFromSource: (options: {
    key: string;
    sourceItem: SourceItem;
  }) => {
    key: string;
    value: IntermediateItem | null;
  } | null;
  getIntermediateTimestampMsFromKey: (key: string) => number;
  getTargetKeyFromTimestampMs?: (timestampMs: number) => string;

  getInitialIntermediateAccumulator: (options: {
    prevTargetItem: TargetItem | null;
  }) => ReducedItem;
  getEmptyIntermediateAccumulator: () => ReducedItem;

  reduceIntermediateWithInitialAccumulator: (options: {
    accumulator: ReducedItem;
    items: ItemChange<IntermediateItem>[];
  }) => ReducedItem;

  mergeIntermediate: (options: {items: ReducedItem[]}) => ReducedItem;

  applyDiffToTargetItem: (options: {
    prevTargetItem: TargetItem | null;
    mergedItem: ReducedItem;
    countDiff: number;
  }) => TargetItem | null;
};

export const createUniqueCounterTransform = <
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
  parseSourceItem,
  parseIntermediateItem,
  serializeIntermediateItem,
  parseTargetItem,
  serializeTargetItem,
  getIntermediateFromSource,
  getIntermediateTimestampMsFromKey,
  getTargetKeyFromTimestampMs,
  getInitialIntermediateAccumulator,
  getEmptyIntermediateAccumulator,
  reduceIntermediateWithInitialAccumulator,
  mergeIntermediate,
  applyDiffToTargetItem,
}: UniqueCounterTransformOptions<
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

  const aggregateTransform = createAggregateByTimestampTransform({
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
    parallelReduceWithInitialAccumulator: ({accumulator, items}) => {
      const acc = reduceIntermediateWithInitialAccumulator({
        accumulator: accumulator.acc,
        items,
      });

      let countDiff = 0;

      items.forEach(({prev, next}) => {
        if (prev !== null) {
          countDiff--;
        }
        if (next !== null) {
          countDiff++;
        }
      });

      return {
        acc: acc,
        countDiff,
      };
    },
    getInitialAccumulator: ({prevTargetItem}) => ({
      acc: getInitialIntermediateAccumulator({prevTargetItem}),
      countDiff: 0,
    }),
    getEmptyAccumulator: () => ({
      acc: getEmptyIntermediateAccumulator(),
      countDiff: 0,
    }),
    merge: ({items}) => {
      let countDiff = 0;

      const acc = mergeIntermediate({
        items: items.map(({acc, countDiff: diff}) => {
          countDiff += diff;
          return acc;
        }),
      });

      return {acc, countDiff};
    },
    apply: ({prevTargetItem, mergedItem: {acc, countDiff}}) => {
      return applyDiffToTargetItem({
        prevTargetItem,
        mergedItem: acc,
        countDiff,
      });
    },
  });

  return async ({context}: {context: Context}) => {
    await mapFilterTransform({context});
    await aggregateTransform({context});
  };
};
