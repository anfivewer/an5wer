import {CreateDatabaseFn} from './types';
import {
  AggregateInterval,
  BaseAggregateTransformOptions,
  createAggregateByTimestampTransform,
} from '@-/diffbelt-util/src/transform/aggregate-by-timestamp';
import {
  Collection,
  Database,
  EncodedValue,
  KeyValue,
} from '@-/diffbelt-types/src/database/types';
import {Logger} from '@-/types/src/logging/logging';
import {createRandomGenerator} from './util';
import {TestLogger} from '@-/util/src/logging/test-logger';
import {dumpCollection} from '@-/diffbelt-util/src/queries/dump';
import {toString} from '@-/diffbelt-util/src/keys/encoding';

export const aggregateByTimestampTest = ({
  createDatabase,
}: {
  createDatabase: CreateDatabaseFn;
}) => {
  describe('aggregateByTimestamp transform', () => {
    jest.setTimeout(15000);

    it('should sum values by time intervals', async () => {
      const {database} = await createDatabase();
      const testLogger = new TestLogger();
      const logger = testLogger.getLogger();

      // Initialize collections
      const {generationId: initialGenerationId} =
        await database.createCollection({
          name: 'aggregateByTimeStampInitial',
          generationId: {value: ''},
        });

      await database.createCollection({
        name: 'aggregateByTimeStampByHour',
        generationId: initialGenerationId,
      });
      await database.createCollection({
        name: 'aggregateByTimeStampByDay',
        generationId: initialGenerationId,
      });

      const [initialCollection, hourCollection, dayCollection] =
        await Promise.all([
          database.getCollection('aggregateByTimeStampInitial'),
          database.getCollection('aggregateByTimeStampByHour'),
          database.getCollection('aggregateByTimeStampByDay'),
        ]);

      hourCollection.createReader({
        readerId: 'fromInitial',
        generationId: null,
        collectionName: 'aggregateByTimeStampInitial',
      });
      dayCollection.createReader({
        readerId: 'fromHour',
        generationId: null,
        collectionName: 'aggregateByTimeStampInitial',
      });

      // Sums collection to intervals
      const createTransform = (
        options: Pick<
          BaseAggregateTransformOptions,
          | 'interval'
          | 'targetCollectionName'
          | 'sourceCollectionName'
          | 'targetFromSourceReaderName'
        >,
      ) => {
        return createAggregateByTimestampTransform({
          ...options,
          parseSourceItem: (value) => parseInt(toString(value), 10),
          parseTargetItem: (value) => parseInt(toString(value), 10),
          serializeTargetItem: (item) => ({value: String(item)}),
          getTimestampMs: (key) => parseInt(toString(key), 10) * 1000,
          getTargetKey: (timestamp) => ({
            value: String(Math.floor(timestamp / 1000)).padStart(10, '0'),
          }),
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
          mapFilter: ({sourceItem}) => {
            return typeof sourceItem === 'number' ? sourceItem : 0;
          },
          parallelReduceWithInitialAccumulator: ({accumulator, items}) => {
            let result = accumulator;

            items.forEach(({prev, next}) => {
              if (prev !== null) {
                result -= prev;
              }
              if (next !== null) {
                result += next;
              }
            });

            return result;
          },
          getInitialAccumulator: ({prevTargetItem}) =>
            typeof prevTargetItem === 'number' ? prevTargetItem : 0,
          getEmptyAccumulator: () => 0,
          merge: ({items}) => {
            return items.reduce((acc, item) => {
              return acc + item;
            });
          },
          apply: ({mergedItem}) => {
            return mergedItem === 0 ? null : mergedItem;
          },
        });
      };

      const hourAggregateTransform = createTransform({
        interval: AggregateInterval.HOUR,
        targetCollectionName: 'aggregateByTimeStampByHour',
        sourceCollectionName: 'aggregateByTimeStampInitial',
        targetFromSourceReaderName: 'fromInitial',
      });

      const dayAggregateTransform = createTransform({
        interval: AggregateInterval.DAY,
        targetCollectionName: 'aggregateByTimeStampByDay',
        sourceCollectionName: 'aggregateByTimeStampByHour',
        targetFromSourceReaderName: 'fromHour',
      });

      // Fill initial collection
      const randomGenerator = createRandomGenerator();
      const currentRecords = new Map<string, string>();

      await initialCollection.startGeneration({
        generationId: {value: '00000000001'},
      });

      for (let i = 0; i < 10; i++) {
        const records: KeyValue[] = [];

        for (let j = 0; j < 1000; j++) {
          const [a, b] = randomGenerator.next64();

          const key = String(a % 864000).padStart(10, '0');
          const value = String(b % 256);

          currentRecords.set(key, value);
          records.push({key: {value: key}, value: {value}});
        }

        await initialCollection.putMany({
          items: records,
          generationId: {value: '00000000001'},
        });
      }

      await initialCollection.commitGeneration({
        generationId: {value: '00000000001'},
      });

      // Run transforms
      await hourAggregateTransform({context: {database, logger}});
      await dayAggregateTransform({context: {database, logger}});

      // Takes `currentRecords` and checks that database performed correct aggregations
      const testAggregated = async ({
        collection,
        intervalSeconds,
        expectedGenerationId,
      }: {
        collection: Collection;
        intervalSeconds: number;
        expectedGenerationId: EncodedValue;
      }) => {
        const expectedRecords = new Map<string, string>();

        currentRecords.forEach((value, key) => {
          const keySeconds = parseInt(key, 10);
          const timestampSeconds = keySeconds - (keySeconds % intervalSeconds);
          const timestampKey = String(timestampSeconds).padStart(10, '0');

          const valueNum = parseInt(value, 10);

          let expectedVal = expectedRecords.get(timestampKey);
          if (typeof expectedVal !== 'string') {
            expectedVal = String(valueNum);
          } else {
            expectedVal = String(parseInt(expectedVal, 10) + valueNum);
          }

          if (expectedVal !== '0') {
            expectedRecords.set(timestampKey, expectedVal);
          } else {
            expectedRecords.delete(timestampKey);
          }
        });

        const {items, generationId} = await dumpCollection(collection);

        expect(generationId).toStrictEqual(expectedGenerationId);

        const actualRecords = new Map<string, string>();

        items.forEach((item) => {
          actualRecords.set(toString(item.key), toString(item.value));
        });

        actualRecords.forEach((value, key) => {
          expect(value).toBe(expectedRecords.get(key));
        });
        expectedRecords.forEach((value, key) => {
          expect(actualRecords.get(key)).toBe(value);
        });
      };

      await testAggregated({
        collection: hourCollection,
        intervalSeconds: 60 * 60,
        expectedGenerationId: {value: '00000000001'},
      });
      await testAggregated({
        collection: dayCollection,
        intervalSeconds: 24 * 60 * 60,
        expectedGenerationId: {value: '00000000001'},
      });

      {
        // Update records
        const currentRecordsList: KeyValue[] = [];
        currentRecords.forEach((value, key) => {
          currentRecordsList.push({key: {value: key}, value: {value}});
        });
        currentRecordsList.sort(({key: keyA}, {key: keyB}) =>
          keyA < keyB ? -1 : keyA > keyB ? 1 : 0,
        );

        await initialCollection.startGeneration({
          generationId: {value: '00000000002'},
        });

        const removedItemsA = currentRecordsList.splice(0, 3);
        await initialCollection.putMany({
          items: removedItemsA.map((item) => ({key: item.key, value: null})),
          generationId: {value: '00000000002'},
        });
        const removedItemsB = currentRecordsList.splice(100, 2);
        await initialCollection.putMany({
          items: removedItemsB.map((item) => ({key: item.key, value: null})),
          generationId: {value: '00000000002'},
        });

        const removedItemsC = currentRecordsList.splice(600, 150);
        await initialCollection.putMany({
          items: removedItemsC.map((item) => ({key: item.key, value: null})),
          generationId: {value: '00000000002'},
        });

        [removedItemsA, removedItemsB, removedItemsC].forEach(
          (removedItems) => {
            removedItems.forEach((item) => {
              currentRecords.delete(toString(item.key));
            });
          },
        );

        const recordsToAdd: KeyValue[] = [];
        for (let i = 0; i < 500; i++) {
          const [a, b] = randomGenerator.next64();

          const key = String(a % 864000).padStart(10, '0');
          const value = String(b % 256);

          currentRecords.set(key, value);
          recordsToAdd.push({key: {value: key}, value: {value}});
        }

        await initialCollection.putMany({
          items: recordsToAdd,
          generationId: {value: '00000000002'},
        });

        await initialCollection.commitGeneration({
          generationId: {value: '00000000002'},
        });
      }

      // Run transforms after updates
      await hourAggregateTransform({context: {database, logger}});
      await dayAggregateTransform({context: {database, logger}});

      await testAggregated({
        collection: hourCollection,
        intervalSeconds: 60 * 60,
        expectedGenerationId: {value: '00000000002'},
      });

      await testAggregated({
        collection: dayCollection,
        intervalSeconds: 24 * 60 * 60,
        expectedGenerationId: {value: '00000000002'},
      });

      expect(testLogger.hasErrorsOrWarnings()).toBe(false);
    });
  });
};
