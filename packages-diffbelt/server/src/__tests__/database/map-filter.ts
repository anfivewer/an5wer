import {Database, KeyValue} from '@-/diffbelt-types/src/database/types';
import {queryCollection} from '@-/diffbelt-util/src/queries/dump';
import {CreateDatabaseFn} from './types';
import {createRandomGenerator} from './util';
import {createMapFilterTransform} from '@-/diffbelt-util/src/transform/map-filter';

export const mapFilterTest = ({
  createDatabase,
}: {
  createDatabase: CreateDatabaseFn;
}) => {
  describe('mapFilter transform', () => {
    it('should map keys and values', async () => {
      const {database} = await createDatabase();

      const {generationId: initialGenerationId} =
        await database.createCollection({
          name: 'mapFilterInitial',
          generationId: '',
        });

      await database.createCollection({
        name: 'mapFilterTarget',
        generationId: initialGenerationId,
      });
      const [initialCollection, targetCollection] = await Promise.all([
        database.getCollection('mapFilterInitial'),
        database.getCollection('mapFilterTarget'),
      ]);

      targetCollection.createReader({
        readerId: 'fromInitial',
        generationId: null,
        collectionName: 'mapFilterInitial',
      });

      const mapFilter = ({key, value}: {key: string; value: number}) => {
        if (value % 2 === 0) {
          return null;
        }

        return {
          key: String(value).padStart(10, '0'),
          value: key,
        };
      };

      const myMapFilterTransform = createMapFilterTransform({
        sourceCollectionName: 'mapFilterInitial',
        targetCollectionName: 'mapFilterTarget',
        targetCollectionReaderName: 'fromInitial',
        getDatabaseFromContext: ({database}: {database: Database}) => database,
        parseSourceCollectionItem: (value) => parseInt(value, 10),
        mapFilter,
      });

      const randomGenerator = createRandomGenerator();

      const currentRecords = new Map<string, string>();
      const currentRecordsList: KeyValue[] = [];

      let initialCollectionGenerationId = 0;

      initialCollectionGenerationId++;
      await initialCollection.startGeneration({
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      // Create initial records
      for (let i = 0; i < 10; i++) {
        const records: KeyValue[] = [];

        for (let j = 0; j < 1000; j++) {
          const [a, b] = randomGenerator.next64();

          const key = `key-${a.toString(16)}`;
          currentRecords.set(key, String(b));

          records.push({key, value: String(b)});
          currentRecordsList.push({key, value: String(b)});
        }

        await initialCollection.putMany({
          items: records,
          generationId: String(initialCollectionGenerationId).padStart(11, '0'),
        });

        if (i === 0 || i === 3 || i === 8) {
          await initialCollection.commitGeneration({
            generationId: String(initialCollectionGenerationId).padStart(
              11,
              '0',
            ),
          });
          initialCollectionGenerationId++;
          await initialCollection.startGeneration({
            generationId: String(initialCollectionGenerationId).padStart(
              11,
              '0',
            ),
          });
        }
      }

      await initialCollection.commitGeneration({
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      const testInitialCollection = async ({
        expectedGenerationId,
      }: {
        expectedGenerationId: string;
      }) => {
        const {generationId, stream} = await queryCollection(initialCollection);
        expect(generationId).toBe(expectedGenerationId);

        const actualItems = new Map<string, string>();

        let prevItemKey = '';

        for await (const items of stream) {
          // eslint-disable-next-line no-loop-func
          items.forEach((item) => {
            actualItems.set(item.key, item.value);

            expect(prevItemKey < item.key).toBe(true);
            prevItemKey = item.key;
          });
        }

        currentRecords.forEach((value, key) => {
          expect(value).toBe(actualItems.get(key));
        });
        actualItems.forEach((value, key) => {
          expect(currentRecords.get(key)).toBe(value);
        });
      };

      await testInitialCollection({expectedGenerationId: '00000000004'});

      await myMapFilterTransform({context: {database}});

      const testMappedCollection = async ({
        expectedGenerationId,
      }: {
        expectedGenerationId: string;
      }) => {
        const {generationId, stream} = await queryCollection(targetCollection);
        expect(generationId).toBe(expectedGenerationId);

        const actualItems = new Map<string, string>();
        const expectedItems = new Map<string, string>();
        currentRecords.forEach((value, key) => {
          const valueNum = parseInt(value, 10);
          const mapped = mapFilter({key, value: valueNum});

          if (mapped) {
            expectedItems.set(mapped.key, mapped.value);
          }
        });

        let prevItemKey = '';

        for await (const items of stream) {
          // eslint-disable-next-line no-loop-func
          items.forEach((item) => {
            actualItems.set(item.key, item.value);

            expect(prevItemKey < item.key).toBe(true);
            prevItemKey = item.key;
          });
        }

        expect(actualItems.size).toBe(expectedItems.size);

        actualItems.forEach((value, key) => {
          expect(value).toBe(expectedItems.get(key));
        });
        expectedItems.forEach((value, key) => {
          expect(actualItems.get(key)).toBe(value);
        });
      };

      await testMappedCollection({expectedGenerationId: '00000000004'});

      initialCollectionGenerationId++;
      await initialCollection.startGeneration({
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      const removedItemsA = currentRecordsList.splice(5, 250);
      await initialCollection.putMany({
        items: removedItemsA.map((item) => ({key: item.key, value: null})),
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });
      const removedItemsB = currentRecordsList.splice(100, 2);
      await initialCollection.putMany({
        items: removedItemsB.map((item) => ({key: item.key, value: null})),
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      await initialCollection.commitGeneration({
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      initialCollectionGenerationId++;
      await initialCollection.startGeneration({
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      const removedItemsC = currentRecordsList.splice(600, 150);
      await initialCollection.putMany({
        items: removedItemsC.map((item) => ({key: item.key, value: null})),
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      [removedItemsA, removedItemsB, removedItemsC].forEach((removedItems) => {
        removedItems.forEach((item) => {
          currentRecords.delete(item.key);
        });
      });

      const recordsToAdd: KeyValue[] = [];
      for (let i = 0; i < 500; i++) {
        const [a, b] = randomGenerator.next64();

        const key = `key-${a.toString(16)}`;
        currentRecords.set(key, String(b));

        recordsToAdd.push({key, value: String(b)});
      }

      await initialCollection.putMany({
        items: recordsToAdd,
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      await initialCollection.commitGeneration({
        generationId: String(initialCollectionGenerationId).padStart(11, '0'),
      });

      await testInitialCollection({expectedGenerationId: '00000000006'});

      await myMapFilterTransform({context: {database}});

      await testMappedCollection({expectedGenerationId: '00000000006'});
    }, 10000);
  });
};
