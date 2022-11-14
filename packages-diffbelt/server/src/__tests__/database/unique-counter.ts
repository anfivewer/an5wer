import {TestLogger} from '@-/util/src/logging/test-logger';
import {initializeDatabaseStructure} from '@-/diffbelt-util/src/database/initialize-structure';
import {CreateDatabaseFn} from './types';
import {createRandomGenerator} from './util';
import {Database, KeyValue} from '@-/diffbelt-types/src/database/types';
import {dumpCollection} from '@-/diffbelt-util/src/queries/dump';
import {createUniqueCounterTransform} from '@-/diffbelt-util/src/transform/unique-counter';
import {AggregateInterval} from '@-/diffbelt-util/src/transform/types';
import {Logger} from '@-/types/src/logging/logging';
import {assertNonNullable} from '@-/types/src/assert/runtime';

export const uniqueCounterTest = ({
  createDatabase,
}: {
  createDatabase: CreateDatabaseFn;
}) => {
  describe('uniqueCounter transform', () => {
    it('should count items', async () => {
      const {database, commitRunner} = await createDatabase();
      const testLogger = new TestLogger();
      const logger = testLogger.getLogger();

      const INTERVAL_SECONDS = 24 * 60 * 60;

      await initializeDatabaseStructure({
        database,
        collections: [
          {name: 'initial'},
          {
            name: 'intermediate',
            isManual: true,
            readers: [{name: 'fromInitial', collectionName: 'initial'}],
          },
          {
            name: 'target',
            isManual: true,
            readers: [
              {
                name: 'fromIntermediate',
                collectionName: 'intermediate',
              },
            ],
          },
        ],
      });

      const [initialCollection, targetCollection] = await Promise.all([
        database.getCollection('initial'),
        database.getCollection('target'),
      ]);

      // Fill initial collection
      const randomGenerator = createRandomGenerator();
      const currentRecords = new Map<string, string>();

      for (let i = 0; i < 10; i++) {
        const records: KeyValue[] = [];

        for (let j = 0; j < 1000; j++) {
          const [a, b] = randomGenerator.next64();

          const key = String(a % 864000).padStart(10, '0');
          const value = String(b % 256);

          currentRecords.set(key, value);
          records.push({key, value});
        }

        await initialCollection.putMany({items: records});
      }

      await commitRunner.makeCommits();

      const transform = createUniqueCounterTransform({
        interval: AggregateInterval.DAY,
        extractContext: ({
          database,
          logger,
        }: {
          database: Database;
          logger: Logger;
        }) => ({
          database,
          logger,
        }),
        sourceCollectionName: 'initial',
        intermediateCollectionName: 'intermediate',
        intermediateToSourceReaderName: 'fromInitial',
        targetCollectionName: 'target',
        targetToIntermediateReaderName: 'fromIntermediate',
        parseSourceItem: (value) => parseInt(value, 10),
        parseIntermediateItem: (value) => parseInt(value, 10),
        serializeIntermediateItem: (item) => String(item),
        parseTargetItem: (value) => {
          const match = /^(\d+) (\d+)$/.exec(value);
          assertNonNullable(match);

          return {
            count: parseInt(match[1], 10),
            sum: parseInt(match[2], 10),
          };
        },
        serializeTargetItem: ({count, sum}) => `${count} ${sum}`,
        getIntermediateFromSource: ({key, sourceItem}) => {
          if (sourceItem % 5 !== 0) {
            return null;
          }

          return {
            key: `${key} ${sourceItem}`,
            value: sourceItem,
          };
        },
        getIntermediateTimestampMsFromKey: (key) => {
          return parseInt(key.split(' ', 1)[0], 10) * 1000;
        },
        getTargetKeyFromTimestampMs: (timestampMs) => {
          return String(Math.floor(timestampMs / 1000)).padStart(10, '0');
        },
        getInitialIntermediateAccumulator: ({prevTargetItem}) =>
          prevTargetItem !== null ? prevTargetItem.sum : 0,
        getEmptyIntermediateAccumulator: () => 0,
        reduceIntermediateWithInitialAccumulator: ({accumulator, items}) => {
          let sum = accumulator;

          items.forEach(({prev, next}) => {
            if (prev !== null) {
              sum -= prev;
            }
            if (next !== null) {
              sum += next;
            }
          });

          return sum;
        },
        mergeIntermediate: ({items}) => {
          return items.reduce((a, b) => a + b);
        },
        applyDiffToTargetItem: ({prevTargetItem, countDiff, mergedItem}) => {
          if (prevTargetItem === null) {
            return {
              count: countDiff,
              sum: mergedItem,
            };
          }

          return {
            count: prevTargetItem.count + countDiff,
            sum: mergedItem,
          };
        },
      });

      const testAggregated = async ({
        expectedGenerationId,
      }: {
        expectedGenerationId: string;
      }) => {
        const preExpectedRecords = new Map<
          string,
          {count: number; sum: number}
        >();

        currentRecords.forEach((value, key) => {
          const valueNum = parseInt(value, 10);

          if (valueNum % 5 !== 0) {
            return;
          }

          const keySeconds = parseInt(key, 10);
          const timestampSeconds = keySeconds - (keySeconds % INTERVAL_SECONDS);
          const timestampKey = String(timestampSeconds).padStart(10, '0');

          let expectedVal = preExpectedRecords.get(timestampKey);
          if (!expectedVal) {
            expectedVal = {
              count: 0,
              sum: 0,
            };
            preExpectedRecords.set(timestampKey, expectedVal);
          }

          expectedVal.count++;
          expectedVal.sum += valueNum;
        });

        const expectedRecords = new Map<string, string>();

        preExpectedRecords.forEach(({count, sum}, key) => {
          expectedRecords.set(key, `${count} ${sum}`);
        });

        const {items, generationId} = await dumpCollection(targetCollection);

        expect(generationId).toBe(expectedGenerationId);

        const actualRecords = new Map<string, string>();

        items.forEach((item) => {
          actualRecords.set(item.key, item.value);
        });

        actualRecords.forEach((value, key) => {
          expect(value).toBe(expectedRecords.get(key));
        });
        expectedRecords.forEach((value, key) => {
          expect(actualRecords.get(key)).toBe(value);
        });
      };

      await transform({context: {database, logger}});
      await testAggregated({expectedGenerationId: '00000000001'});

      {
        // Update records
        const currentRecordsList: KeyValue[] = [];
        currentRecords.forEach((value, key) => {
          currentRecordsList.push({key, value});
        });
        currentRecordsList.sort(({key: keyA}, {key: keyB}) =>
          keyA < keyB ? -1 : keyA > keyB ? 1 : 0,
        );

        const removedItemsA = currentRecordsList.splice(0, 3);
        await initialCollection.putMany({
          items: removedItemsA.map((item) => ({key: item.key, value: null})),
        });
        const removedItemsB = currentRecordsList.splice(100, 2);
        await initialCollection.putMany({
          items: removedItemsB.map((item) => ({key: item.key, value: null})),
        });

        const removedItemsC = currentRecordsList.splice(600, 150);
        await initialCollection.putMany({
          items: removedItemsC.map((item) => ({key: item.key, value: null})),
        });

        [removedItemsA, removedItemsB, removedItemsC].forEach(
          (removedItems) => {
            removedItems.forEach((item) => {
              currentRecords.delete(item.key);
            });
          },
        );

        const recordsToAdd: KeyValue[] = [];
        for (let i = 0; i < 500; i++) {
          const [a, b] = randomGenerator.next64();

          const key = String(a % 864000).padStart(10, '0');
          const value = String(b % 256);

          currentRecords.set(key, value);
          recordsToAdd.push({key, value});
        }

        await initialCollection.putMany({items: recordsToAdd});

        await commitRunner.makeCommits();
      }

      await transform({context: {database, logger}});
      await testAggregated({expectedGenerationId: '00000000002'});

      expect(testLogger.hasErrorsOrWarnings()).toBe(false);
    });
  });
};
