import {Database} from '@-/diffbelt-types/src/database/types';
import {Parallel} from '@-/util/src/async/parallel';
import {IdlingStatus} from '@-/util/src/state/idling-status';
import {diffCollection} from '../queries/diff';
import {Logger} from '@-/types/src/logging/logging';
import {AggregateInterval, isItemChange, ItemChange} from './types';
import {Defer} from '@-/util/src/async/defer';
import {assertNonNullable} from '@-/types/src/assert/runtime';
import {getIntervalTsMs} from '../intervals/get-interval-ts';

/** @deprecated */
export {AggregateInterval};

type IntervalData<TargetItem> = {
  intervalTimestampMs: number;
  prevTargetItem: TargetItem | null;
  fromGenerationId: string | null;
  generationId: string;
};

export type BaseAggregateTransformOptions = {
  interval: AggregateInterval;
  targetCollectionName: string;
  sourceCollectionName: string;
  targetFromSourceReaderName: string;
  // If `true` then any change of source data inside of interval
  // will trigger full interval rebuilding
  fullRecalculationRequired?: boolean;
  maxItemsForReduce?: number;
};

type MergeFn<TargetItem, ReducedItem> = (
  options: IntervalData<TargetItem> & {
    items: ReducedItem[];
  },
) => ReducedItem;

type ApplyFn<TargetItem, ReducedItem> = (
  options: IntervalData<TargetItem> & {
    mergedItem: ReducedItem;
  },
) => TargetItem | null;

type AggregateTransformOptions<
  Context,
  SourceItem,
  TargetItem,
  MappedItem,
  ReducedItem,
  CustomData = unknown,
> = BaseAggregateTransformOptions & {
  parseSourceItem: (value: string) => SourceItem;
  parseTargetItem: (value: string) => TargetItem;
  serializeTargetItem: (value: TargetItem) => string;
  getTimestampMs: (sourceKey: string) => number;
  getTargetKey?: (intervalTimestampMs: number) => string;

  extractContext: (context: Context) => {database: Database; logger: Logger};
  mapFilter: (
    options: IntervalData<TargetItem> & {
      timestampMs: number;
      sourceKey: string;
      // `null` if was removed
      sourceItem: SourceItem | null;
    },
    // Return `null` if item should be ignored
  ) => MappedItem | null;
} & (
    | {
        // `parallel` means that if we have items [A, B, C, D, E, F] then there can be:
        //   - parallelReduce({..., items: [A, B]}) -> reducedAB
        //   - parallelReduce({..., items: [A, B]}) -> reducedCD
        //   - parallelReduce({..., items: [E, F]}) -> reducedEF
        //   - merge({..., items: [reducedAB, reducedCD]}) -> mergedABCD
        //   - merge({..., items: [mergedABCD, reducedEF]}) -> mergedABCDEF
        //   - apply({..., mergedItem: mergedABCDEF}) -> newTargetItem
        parallelReduce: (
          options: IntervalData<TargetItem> & {
            accumulator: ReducedItem | undefined;
            items: ItemChange<MappedItem>[];
          },
        ) => ReducedItem;
        merge: MergeFn<TargetItem, ReducedItem>;
        apply: ApplyFn<TargetItem, ReducedItem>;
        applyWithState?: never;
        getInitialAccumulator?: never;
        getEmptyAccumulator?: never;
        sequentalReduceWithInitialAccumulator?: never;
      }
    | {
        parallelReduceWithInitialAccumulator: (
          options: IntervalData<TargetItem> & {
            accumulator: ReducedItem;
            items: ItemChange<MappedItem>[];
          },
        ) => ReducedItem;
        getInitialAccumulator: (
          options: IntervalData<TargetItem>,
        ) => ReducedItem;
        getEmptyAccumulator: () => ReducedItem;
        merge: MergeFn<TargetItem, ReducedItem>;
        apply: ApplyFn<TargetItem, ReducedItem>;
        applyWithState?: never;
        sequentalReduceWithInitialAccumulator?: never;
      }
    | {
        sequentalReduceWithInitialAccumulator: (
          options: IntervalData<TargetItem> & {
            accumulator: ReducedItem;
            items: ItemChange<MappedItem>[];
            state: CustomData;
          },
        ) => ReducedItem | Promise<ReducedItem>;
        getInitialAccumulator: (
          options: IntervalData<TargetItem>,
        ) => ReducedItem;
        getEmptyAccumulator?: never;
        merge?: never;
        getIntervalState: (
          options: IntervalData<TargetItem> & {context: Context},
        ) => CustomData | Promise<CustomData>;
        apply?: never;
        applyWithState: (
          options: IntervalData<TargetItem> & {
            mergedItem: ReducedItem;
            state: CustomData;
          },
        ) => TargetItem | null;
      }
  );

export const createAggregateByTimestampTransform = <
  Context,
  SourceItem,
  TargetItem,
  MappedItem,
  ReducedItem,
  CustomData = unknown,
>(
  options: AggregateTransformOptions<
    Context,
    SourceItem,
    TargetItem,
    MappedItem,
    ReducedItem,
    CustomData
  >,
): ((options: {context: Context}) => Promise<void>) => {
  const {
    interval,
    targetCollectionName,
    sourceCollectionName,
    fullRecalculationRequired = false,
    targetFromSourceReaderName,
    parseSourceItem,
    parseTargetItem,
    serializeTargetItem,
    getTimestampMs,
    getTargetKey = (timestamp) => new Date(timestamp).toISOString(),
    extractContext,
    mapFilter,
    maxItemsForReduce = 100,
    merge,
  } = options;

  switch (interval) {
    case AggregateInterval.WEEK:
    case AggregateInterval.MONTH:
      throw new Error('week/month intervals are not implemented yet');
  }

  if (fullRecalculationRequired) {
    throw new Error('fullRecalculationRequired is not implemented yet');
  }

  return async ({context}) => {
    const {database: db, logger: rootLogger} = extractContext(context);

    const logger = rootLogger.fork(
      `aggregate:${sourceCollectionName}>${targetCollectionName}`,
    );

    const [sourceCollection, targetCollection] = await Promise.all([
      db.getCollection(sourceCollectionName),
      db.getCollection(targetCollectionName),
    ]);

    const {stream, fromGenerationId, generationId} = await diffCollection(
      sourceCollection,
      {
        diffOptions: {
          readerId: targetFromSourceReaderName,
          readerCollectionName: targetCollectionName,
        },
      },
    );

    await targetCollection.startGeneration({
      generationId,
      abortOutdated: true,
    });

    const reducesParallel = new Parallel();
    const mergesParallel = new Parallel();
    const finishTasks = new IdlingStatus();

    type IntervalChanges = {
      startKey: string;
      nextKey: string | undefined;
      items: ItemChange<MappedItem>[];
    };

    let currentIntervalTs: number | undefined;
    let nextIntervalTs: number | undefined;
    let currentIntervalChanges: IntervalChanges | undefined;
    let currentPrevTargetItem: TargetItem | null = null;

    let catchedError: unknown;

    type PendingReducedItem = {
      startKey: string;
      nextKey: string | undefined;
      item: ReducedItem;
    };

    type IntervalProgressStatus = {
      intervalTimestampMs: number;
      prevTargetItem: TargetItem | null;
      reducedItems: Map<string, PendingReducedItem>;
      reducedItemsByNextKey: Map<string, PendingReducedItem>;
      pendingTasks: IdlingStatus;
      sequentalChanges: Map<string, IntervalChanges>;
      sequentalDefer: Defer;
      state: CustomData | undefined;
    };

    const intervalsInProgress = new Map<number, IntervalProgressStatus>();

    const pushPendingReducedItem = ({
      startKey,
      nextKey,
      item,
      progressStatus,
    }: {
      startKey: string;
      nextKey: string | undefined;
      item: ReducedItem;
      progressStatus: IntervalProgressStatus;
    }) => {
      const pendingReducedItem: PendingReducedItem = {
        startKey,
        nextKey,
        item,
      };

      const chain: PendingReducedItem[] = [];

      let prevKey: string | undefined = startKey;
      while (prevKey !== undefined) {
        const prevPending = progressStatus.reducedItemsByNextKey.get(prevKey);
        if (!prevPending) {
          break;
        }

        chain.unshift(prevPending);
        prevKey = prevPending.startKey;
      }

      chain.push(pendingReducedItem);

      let lastKey = nextKey;
      while (lastKey !== undefined) {
        const nextPending = progressStatus.reducedItems.get(lastKey);
        if (!nextPending) {
          break;
        }

        chain.push(nextPending);
        lastKey = nextPending.nextKey;
      }

      if (chain.length > 1) {
        // Remove items from pending to process them,
        // else they can be included in other chain
        chain.forEach(({startKey, nextKey}) => {
          progressStatus.reducedItems.delete(startKey);

          if (typeof nextKey === 'string') {
            progressStatus.reducedItemsByNextKey.delete(nextKey);
          }
        });

        scheduleIntervalMerge({
          chain,
          progressStatus,
        });
      } else {
        // Wait for finish or some chain creation
        progressStatus.reducedItems.set(startKey, pendingReducedItem);

        if (typeof nextKey === 'string') {
          progressStatus.reducedItemsByNextKey.set(nextKey, pendingReducedItem);
        }
      }
    };

    const scheduleIntervalReduce = ({
      intervalTimestampMs,
      changes,
      prevTargetItem,
    }: {
      intervalTimestampMs: number;
      changes: IntervalChanges;
      prevTargetItem: TargetItem | null;
    }) => {
      let maybeProgressStatus = intervalsInProgress.get(intervalTimestampMs);
      const isInitialPart = !maybeProgressStatus;
      const allowInitialAccumulatorCreation = isInitialPart;

      if (!maybeProgressStatus) {
        maybeProgressStatus = {
          intervalTimestampMs,
          prevTargetItem,
          reducedItems: new Map(),
          reducedItemsByNextKey: new Map(),
          pendingTasks: new IdlingStatus(),
          sequentalChanges: new Map(),
          sequentalDefer: new Defer(),
          state: undefined,
        };
        intervalsInProgress.set(intervalTimestampMs, maybeProgressStatus);
      }

      const progressStatus = maybeProgressStatus;

      progressStatus.pendingTasks
        .wrapTask(async () => {
          // It is outside of `reducesParallel` because we don't want to block
          // changes reading, because it will deadblock this sequental processing
          // FIXME: add some kind of limit here
          if (options.sequentalReduceWithInitialAccumulator) {
            const {
              sequentalReduceWithInitialAccumulator,
              getInitialAccumulator,
              getIntervalState,
            } = options;

            const initialKey = changes.startKey;

            if (isInitialPart) {
              const state = await getIntervalState({
                intervalTimestampMs,
                prevTargetItem,
                context,
                fromGenerationId,
                generationId,
              });

              progressStatus.state = state;

              let accumulator = getInitialAccumulator({
                intervalTimestampMs,
                prevTargetItem,
                fromGenerationId,
                generationId,
              });

              let lastChanges = changes;

              while (true) {
                const {nextKey, items} = lastChanges;

                accumulator = await sequentalReduceWithInitialAccumulator({
                  accumulator,
                  intervalTimestampMs,
                  prevTargetItem,
                  items,
                  state,
                  fromGenerationId,
                  generationId,
                });

                if (typeof nextKey !== 'string') {
                  // All items are reduced, it will be taken at finish part
                  progressStatus.reducedItems.set(initialKey, {
                    startKey: initialKey,
                    nextKey: undefined,
                    item: accumulator,
                  });
                  break;
                }

                // Wait for next batch availability and process it
                lastChanges = await (async () => {
                  while (true) {
                    const changes =
                      progressStatus.sequentalChanges.get(nextKey);

                    if (changes) {
                      return changes;
                    }

                    await progressStatus.sequentalDefer.promise;
                    progressStatus.sequentalDefer = new Defer();
                  }
                })();
              }

              return;
            }

            progressStatus.sequentalChanges.set(changes.startKey, changes);
            progressStatus.sequentalDefer.resolve();

            return;
          }

          const {startKey, nextKey, items} = changes;

          await reducesParallel.schedule(() => {
            const reducedItem = (() => {
              if (options.getInitialAccumulator) {
                const {
                  parallelReduceWithInitialAccumulator,
                  getInitialAccumulator,
                  getEmptyAccumulator,
                } = options;

                const accumulator = allowInitialAccumulatorCreation
                  ? getInitialAccumulator({
                      intervalTimestampMs,
                      prevTargetItem,
                      fromGenerationId,
                      generationId,
                    })
                  : getEmptyAccumulator();

                return parallelReduceWithInitialAccumulator({
                  accumulator,
                  intervalTimestampMs,
                  prevTargetItem,
                  items,
                  fromGenerationId,
                  generationId,
                });
              }

              const {parallelReduce} = options;

              return parallelReduce({
                accumulator: undefined,
                intervalTimestampMs,
                prevTargetItem,
                items,
                fromGenerationId,
                generationId,
              });
            })();

            pushPendingReducedItem({
              startKey,
              nextKey,
              item: reducedItem,
              progressStatus,
            });

            return Promise.resolve();
          });
        })
        .catch((error) => {
          logger.error('reduce', {intervalTimestampMs}, {error});

          if (!catchedError) {
            catchedError = error;
          }
        });
    };

    const scheduleIntervalMerge = ({
      chain,
      progressStatus,
    }: {
      chain: PendingReducedItem[];
      progressStatus: IntervalProgressStatus;
    }) => {
      const {intervalTimestampMs, prevTargetItem} = progressStatus;

      assertNonNullable(merge, 'scheduleIntervalMerge: no merge');

      progressStatus.pendingTasks
        .wrapTask(async () => {
          await mergesParallel.schedule(() => {
            const mergedItem = merge({
              intervalTimestampMs,
              prevTargetItem,
              items: chain.map(({item}) => item),
              fromGenerationId,
              generationId,
            });

            const {startKey} = chain[0];
            const {nextKey} = chain[chain.length - 1];

            pushPendingReducedItem({
              startKey,
              nextKey,
              item: mergedItem,
              progressStatus,
            });

            return Promise.resolve();
          });
        })
        .catch((error) => {
          logger.error('merge', {intervalTimestampMs}, {error});

          if (!catchedError) {
            catchedError = error;
          }
        });
    };

    const scheduleIntervalFinish = (intervalTimestampMs: number) => {
      const progressStatus = intervalsInProgress.get(intervalTimestampMs);
      if (!progressStatus) {
        throw new Error('finish: no such interval in progress');
      }

      const {
        prevTargetItem,
        pendingTasks,
        reducedItems,
        reducedItemsByNextKey,
      } = progressStatus;

      finishTasks
        .wrapTask(async () => {
          await pendingTasks.onIdle();

          if (reducedItems.size !== 1) {
            throw new Error('finish: not single item');
          }
          if (reducedItemsByNextKey.size !== 0) {
            console.log(reducedItemsByNextKey);
            throw new Error('finish: reducedItemsByNextKey is not empty');
          }

          const iteratorResult = reducedItems.values().next();
          if (iteratorResult.done ?? false) {
            throw new Error('finish: impossible, no item');
          }

          const {value: pendingMergedItem} = iteratorResult;
          const {item: mergedItem} = pendingMergedItem;

          const targetItem = (
            options.sequentalReduceWithInitialAccumulator
              ? options.applyWithState
              : options.apply
          )({
            intervalTimestampMs,
            prevTargetItem,
            mergedItem,
            fromGenerationId,
            generationId,
            state: progressStatus.state!,
          });

          const key = getTargetKey(intervalTimestampMs);
          const value =
            targetItem !== null ? serializeTargetItem(targetItem) : null;

          await targetCollection.put({key, value, generationId});
        })
        .catch((error) => {
          logger.error('finish', {intervalTimestampMs}, {error});

          if (!catchedError) {
            catchedError = error;
          }
        });
    };

    const scheduleIntervalChange = ({
      key,
      intervalTimestampMs,
      change,
      prevTargetItem,
    }: {
      key: string;
      intervalTimestampMs: number;
      change: ItemChange<MappedItem>;
      prevTargetItem: TargetItem | null;
    }) => {
      if (
        currentIntervalTs === undefined ||
        nextIntervalTs == undefined ||
        !currentIntervalChanges
      ) {
        currentIntervalTs = intervalTimestampMs;
        nextIntervalTs = intervalTimestampMs + interval;
        currentIntervalChanges = {
          startKey: key,
          nextKey: undefined,
          items: [],
        };
        currentPrevTargetItem = prevTargetItem;
      }

      if (intervalTimestampMs >= nextIntervalTs) {
        scheduleIntervalReduce({
          intervalTimestampMs: currentIntervalTs,
          changes: currentIntervalChanges,
          prevTargetItem: currentPrevTargetItem,
        });
        scheduleIntervalFinish(currentIntervalTs);

        currentIntervalTs = intervalTimestampMs;
        nextIntervalTs = intervalTimestampMs + interval;
        currentIntervalChanges = {
          startKey: key,
          nextKey: undefined,
          items: [],
        };
        currentPrevTargetItem = prevTargetItem;
      }

      if (currentIntervalChanges.items.length >= maxItemsForReduce) {
        currentIntervalChanges.nextKey = key;

        scheduleIntervalReduce({
          intervalTimestampMs: currentIntervalTs,
          changes: currentIntervalChanges,
          prevTargetItem: currentPrevTargetItem,
        });

        currentIntervalChanges = {
          startKey: key,
          nextKey: undefined,
          items: [],
        };
      }

      currentIntervalChanges.items.push(change);
    };

    for await (const diffs of stream) {
      for (const {key, values} of diffs) {
        const prevValueRaw = values[0];
        const lastValueRaw = values[values.length - 1];

        if (prevValueRaw === lastValueRaw) {
          continue;
        }

        const prevValue =
          prevValueRaw !== null ? parseSourceItem(prevValueRaw) : null;
        const lastValue =
          lastValueRaw !== null ? parseSourceItem(lastValueRaw) : null;

        const keyTs = getTimestampMs(key);

        const intervalTs = getIntervalTsMs({interval, timestampMs: keyTs});

        const prevTargetItem =
          fromGenerationId === null
            ? null
            : await (async () => {
                const targetKey = getTargetKey(intervalTs);

                const {item: prevTargetItemRaw} = await targetCollection.get({
                  key: targetKey,
                  generationId: fromGenerationId,
                });

                return prevTargetItemRaw
                  ? parseTargetItem(prevTargetItemRaw.value)
                  : null;
              })();

        const prevMappedItem = mapFilter({
          intervalTimestampMs: intervalTs,
          prevTargetItem,
          timestampMs: keyTs,
          sourceKey: key,
          sourceItem: prevValue,
          fromGenerationId,
          generationId,
        });
        const lastMappedItem = mapFilter({
          intervalTimestampMs: intervalTs,
          prevTargetItem,
          timestampMs: keyTs,
          sourceKey: key,
          sourceItem: lastValue,
          fromGenerationId,
          generationId,
        });

        const change = {key, prev: prevMappedItem, next: lastMappedItem};

        if (!isItemChange(change)) {
          continue;
        }

        scheduleIntervalChange({
          intervalTimestampMs: intervalTs,
          key,
          change,
          prevTargetItem,
        });
      }

      await reducesParallel.onSlotsAvailable();

      if (catchedError) {
        throw catchedError;
      }
    }

    if (typeof currentIntervalTs === 'number' && currentIntervalChanges) {
      scheduleIntervalReduce({
        intervalTimestampMs: currentIntervalTs,
        changes: currentIntervalChanges,
        prevTargetItem: currentPrevTargetItem,
      });
      scheduleIntervalFinish(currentIntervalTs);
    }

    await reducesParallel.onEmpty();
    await mergesParallel.onEmpty();
    await finishTasks.onIdle();

    if (catchedError) {
      throw catchedError;
    }

    const idles: IdlingStatus[] = [];

    intervalsInProgress.forEach(({pendingTasks}) => {
      idles.push(pendingTasks);
    });

    await Promise.all(idles.map((idling) => idling.onIdle()));

    if (catchedError) {
      throw catchedError;
    }

    await targetCollection.commitGeneration({
      generationId,
      updateReaders: [{readerId: targetFromSourceReaderName, generationId}],
    });
  };
};
