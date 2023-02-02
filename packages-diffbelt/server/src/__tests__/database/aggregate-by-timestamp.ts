import {CreateDatabaseFn} from './types';
import {
  AggregateInterval,
  BaseAggregateTransformOptions,
  createAggregateByTimestampTransform,
} from '@-/diffbelt-util/src/transform/aggregate-by-timestamp';
import {
  Collection,
  Database,
  KeyValue,
} from '@-/diffbelt-types/src/database/types';
import {Logger} from '@-/types/src/logging/logging';
import {createRandomGenerator} from './util';
import {TestLogger} from '@-/util/src/logging/test-logger';
import {dumpCollection} from '@-/diffbelt-util/src/queries/dump';

export const aggregateByTimestampTest = ({
  createDatabase,
}: {
  createDatabase: CreateDatabaseFn;
}) => {
  describe('aggregateByTimestamp transform', () => {
    it('should sum values by time intervals', async () => {
      const {database, commitRunner} = await createDatabase();
      const testLogger = new TestLogger();
      const logger = testLogger.getLogger();

      // Initialize collections
      const {generationId: initialGenerationId} =
        await database.createCollection({name: 'initial'});

      await database.createCollection({
        name: 'byHour',
        generationId: initialGenerationId,
      });
      await database.createCollection({
        name: 'byDay',
        generationId: initialGenerationId,
      });

      const [initialCollection, hourCollection, dayCollection] =
        await Promise.all([
          database.getCollection('initial'),
          database.getCollection('byHour'),
          database.getCollection('byDay'),
        ]);

      hourCollection.createReader({
        readerId: 'fromInitial',
        generationId: null,
        collectionName: 'initial',
      });
      dayCollection.createReader({
        readerId: 'fromHour',
        generationId: null,
        collectionName: 'initial',
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
          parseSourceItem: (value) => parseInt(value, 10),
          parseTargetItem: (value) => parseInt(value, 10),
          serializeTargetItem: (item) => String(item),
          getTimestampMs: (key) => parseInt(key, 10) * 1000,
          getTargetKey: (timestamp) =>
            String(Math.floor(timestamp / 1000)).padStart(10, '0'),
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
        targetCollectionName: 'byHour',
        sourceCollectionName: 'initial',
        targetFromSourceReaderName: 'fromInitial',
      });

      const dayAggregateTransform = createTransform({
        interval: AggregateInterval.DAY,
        targetCollectionName: 'byDay',
        sourceCollectionName: 'byHour',
        targetFromSourceReaderName: 'fromHour',
      });

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
        expectedGenerationId: string;
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

      await testAggregated({
        collection: hourCollection,
        intervalSeconds: 60 * 60,
        expectedGenerationId: '00000000001',
      });
      await testAggregated({
        collection: dayCollection,
        intervalSeconds: 24 * 60 * 60,
        expectedGenerationId: '00000000001',
      });

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

      // Run transforms after updates
      await hourAggregateTransform({context: {database, logger}});
      await dayAggregateTransform({context: {database, logger}});

      await testAggregated({
        collection: hourCollection,
        intervalSeconds: 60 * 60,
        expectedGenerationId: '00000000002',
      });

      await testAggregated({
        collection: dayCollection,
        intervalSeconds: 24 * 60 * 60,
        expectedGenerationId: '00000000002',
      });

      expect(testLogger.hasErrorsOrWarnings()).toBe(false);
    });
  });
};
