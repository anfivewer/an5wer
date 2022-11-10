import {diffCollection} from '@-/diffbelt-server/src/util/database/queries/diff';
import {Parallel} from '@-/util/src/async/parallel';
import {IdlingStatus} from '@-/util/src/state/idling-status';
import {Context} from '../../context/types';

export const enum AggregateInterval {
  MINUTE = 60,
  FIVE_MINUTES = 30,
  FIFTEEN_MINUTES = 900,
  HOUR = 3600,
  DAY = 86400,
  // special cases, since bound to start of week/month
  WEEK = 'week',
  MONTH = 'month',
}

type IntervalData<TargetItem> = {
  intervalTimestampMs: number;
  prevTargetItem: TargetItem | null;
};

type ItemChange<Item> =
  // updated
  | {prev: Item; next: Item}
  // created
  | {prev: null; next: Item}
  // removed
  | {prev: Item; next: null};

const isItemChange = <Item>(value: {
  prev: Item | null;
  next: Item | null;
}): value is ItemChange<Item> => {
  const {prev, next} = value;

  return prev !== null || next !== null;
};

type AggregateTransformOptions<
  SourceItem,
  TargetItem,
  MappedItem,
  ReducedItem,
> = {
  interval: AggregateInterval;
  targetCollectionName: string;
  sourceCollectionName: string;
  targetFromSourceReaderName: string;
  parseSourceItem: (value: string) => SourceItem;
  parseTargetItem: (value: string) => TargetItem;
  serializeTargetItem: (value: TargetItem) => string;
  getTimestampMs: (sourceKey: string) => number;
  // If `true` then any change of source data inside of interval
  // will trigger full interval rebuilding
  fullRecalculationRequired?: boolean;

  maxItemsForReduce?: number;

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
      getInitialAccumulator?: never;
      getEmptyAccumulator?: never;
    }
  | {
      parallelReduceWithInitialAccumulator: (
        options: IntervalData<TargetItem> & {
          accumulator: ReducedItem;
          items: ItemChange<MappedItem>[];
        },
      ) => ReducedItem;
      getInitialAccumulator: (options: IntervalData<TargetItem>) => ReducedItem;
      getEmptyAccumulator: () => ReducedItem;
    }
) & {
    merge: (
      options: IntervalData<TargetItem> & {
        items: ReducedItem[];
      },
    ) => ReducedItem;

    apply: (
      options: IntervalData<TargetItem> & {
        mergedItem: ReducedItem;
      },
    ) => TargetItem | null;
  };

export const createAggregateByTimestampTransform = <
  SourceItem,
  TargetItem,
  MappedItem,
  ReducedItem,
>(
  options: AggregateTransformOptions<
    SourceItem,
    TargetItem,
    MappedItem,
    ReducedItem
  >,
): ((options: {context: Context}) => Promise<void>) => {
  const {
    interval,
    targetCollectionName,
    sourceCollectionName,
    fullRecalculationRequired,
    targetFromSourceReaderName,
    parseSourceItem,
    parseTargetItem,
    serializeTargetItem,
    getTimestampMs,
    mapFilter,
    maxItemsForReduce = 100,
    merge,
    apply,
  } = options;

  const getTargetKey = (intervalTs: number) => {
    return new Date(intervalTs).toISOString();
  };

  switch (interval) {
    case AggregateInterval.WEEK:
    case AggregateInterval.MONTH:
      throw new Error('week/month intervals are not implemented yet');
  }

  if (fullRecalculationRequired) {
    throw new Error('fullRecalculationRequired is not implemented yet');
  }

  return async ({context}) => {
    const {database, logger: rootLogger} = context;
    const db = database.getDiffbelt();

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
      timestampMs: number;
      nextTimestampMs: number | undefined;
      items: ItemChange<MappedItem>[];
    };

    let currentIntervalTs: number | undefined;
    let nextIntervalTs: number | undefined;
    let currentIntervalChanges: IntervalChanges | undefined;
    let currentPrevTargetItem: TargetItem | null = null;

    let catchedError: unknown;

    type PendingReducedItem = {
      timestampMs: number;
      nextTimestampMs: number | undefined;
      item: ReducedItem;
    };

    type IntervalProgressStatus = {
      intervalTimestampMs: number;
      prevTargetItem: TargetItem | null;
      reducedItems: Map<number, PendingReducedItem>;
      reducedItemsByNextTs: Map<number, PendingReducedItem>;
      pendingTasks: IdlingStatus;
    };

    const intervalsInProgress = new Map<number, IntervalProgressStatus>();

    const pushPendingReducedItem = ({
      timestampMs,
      nextTimestampMs,
      item,
      progressStatus,
    }: {
      timestampMs: number;
      nextTimestampMs: number | undefined;
      item: ReducedItem;
      progressStatus: IntervalProgressStatus;
    }) => {
      const pendingReducedItem: PendingReducedItem = {
        timestampMs,
        nextTimestampMs,
        item,
      };

      const chain: PendingReducedItem[] = [];

      let prevTimestampMs: number | undefined = timestampMs;
      while (prevTimestampMs !== undefined) {
        const prevPending =
          progressStatus.reducedItemsByNextTs.get(prevTimestampMs);
        if (!prevPending) {
          break;
        }

        chain.unshift(prevPending);
        prevTimestampMs = prevPending.timestampMs;
      }

      chain.push(pendingReducedItem);

      let lastTimestampMs = nextTimestampMs;
      while (lastTimestampMs !== undefined) {
        const nextPending = progressStatus.reducedItems.get(lastTimestampMs);
        if (!nextPending) {
          break;
        }

        chain.push(nextPending);
        lastTimestampMs = nextPending.nextTimestampMs;
      }

      if (chain.length > 1) {
        // Remove items from pending to process them,
        // else they can be included in other chain
        chain.forEach(({timestampMs, nextTimestampMs}) => {
          progressStatus.reducedItems.delete(timestampMs);

          if (typeof nextTimestampMs === 'number') {
            progressStatus.reducedItemsByNextTs.delete(nextTimestampMs);
          }
        });

        scheduleIntervalMerge({
          chain,
          progressStatus,
        });
      } else {
        // Wait for finish or some chain creation
        progressStatus.reducedItems.set(timestampMs, pendingReducedItem);

        if (typeof nextTimestampMs === 'number') {
          progressStatus.reducedItemsByNextTs.set(
            nextTimestampMs,
            pendingReducedItem,
          );
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
      const allowInitialAccumulatorCreation = !maybeProgressStatus;

      if (!maybeProgressStatus) {
        maybeProgressStatus = {
          intervalTimestampMs,
          prevTargetItem,
          reducedItems: new Map(),
          reducedItemsByNextTs: new Map(),
          pendingTasks: new IdlingStatus(),
        };
        intervalsInProgress.set(intervalTimestampMs, maybeProgressStatus);
      }

      const progressStatus = maybeProgressStatus;

      progressStatus.pendingTasks
        .wrapTask(async () => {
          const {timestampMs, nextTimestampMs, items} = changes;

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
                    })
                  : getEmptyAccumulator();

                return parallelReduceWithInitialAccumulator({
                  accumulator,
                  intervalTimestampMs,
                  prevTargetItem,
                  items,
                });
              }

              const {parallelReduce} = options;

              return parallelReduce({
                accumulator: undefined,
                intervalTimestampMs,
                prevTargetItem,
                items,
              });
            })();

            pushPendingReducedItem({
              timestampMs,
              nextTimestampMs,
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

      progressStatus.pendingTasks
        .wrapTask(async () => {
          await mergesParallel.schedule(() => {
            const mergedItem = merge({
              intervalTimestampMs,
              prevTargetItem,
              items: chain.map(({item}) => item),
            });

            const {timestampMs} = chain[0];
            const {nextTimestampMs} = chain[chain.length - 1];

            pushPendingReducedItem({
              timestampMs,
              nextTimestampMs,
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

      const {prevTargetItem, pendingTasks, reducedItems, reducedItemsByNextTs} =
        progressStatus;

      finishTasks
        .wrapTask(async () => {
          await pendingTasks.onIdle();

          if (reducedItems.size !== 1) {
            throw new Error('finish: not single item');
          }
          if (reducedItemsByNextTs.size !== 0) {
            throw new Error('finish: reducedItemsByNextTs is not empty');
          }

          const iteratorResult = reducedItems.values().next();
          if (iteratorResult.done) {
            throw new Error('finish: impossible, no item');
          }

          const {value: pendingMergedItem} = iteratorResult;
          const {item: mergedItem} = pendingMergedItem;

          const targetItem = apply({
            intervalTimestampMs,
            prevTargetItem,
            mergedItem,
          });

          const key = getTargetKey(intervalTimestampMs);
          const value = targetItem ? serializeTargetItem(targetItem) : null;

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
      timestampMs,
      intervalTimestampMs,
      change,
      prevTargetItem,
    }: {
      timestampMs: number;
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
          timestampMs,
          nextTimestampMs: undefined,
          items: [],
        };
        currentPrevTargetItem = prevTargetItem;
      }

      if (intervalTimestampMs >= nextIntervalTs) {
        scheduleIntervalReduce({
          intervalTimestampMs: currentIntervalTs,
          changes: currentIntervalChanges,
          prevTargetItem,
        });
        scheduleIntervalFinish(currentIntervalTs);

        currentIntervalTs = intervalTimestampMs;
        nextIntervalTs = intervalTimestampMs + interval;
        currentIntervalChanges = {
          timestampMs,
          nextTimestampMs: undefined,
          items: [],
        };
        currentPrevTargetItem = prevTargetItem;
      }

      if (currentIntervalChanges.items.length >= maxItemsForReduce) {
        currentIntervalChanges.nextTimestampMs = timestampMs;

        scheduleIntervalReduce({
          intervalTimestampMs: currentIntervalTs,
          changes: currentIntervalChanges,
          prevTargetItem,
        });

        currentIntervalChanges = {
          timestampMs,
          nextTimestampMs: undefined,
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

        const intervalTs = keyTs - (keyTs % (interval * 1000));

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
        });
        const lastMappedItem = mapFilter({
          intervalTimestampMs: intervalTs,
          prevTargetItem,
          timestampMs: keyTs,
          sourceKey: key,
          sourceItem: lastValue,
        });

        const change = {prev: prevMappedItem, next: lastMappedItem};

        if (!isItemChange(change)) {
          continue;
        }

        scheduleIntervalChange({
          intervalTimestampMs: intervalTs,
          timestampMs: keyTs,
          change,
          prevTargetItem,
        });
      }

      await reducesParallel.onSlotsAvailable();

      if (catchedError) {
        throw catchedError;
      }
    }

    if (currentIntervalTs && currentIntervalChanges) {
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
