import {
  Collection,
  Database,
  DiffResultItems,
  EncodedValue,
} from '@-/diffbelt-types/src/database/types';
import {NoSuchCollectionError} from '@-/diffbelt-types/src/database/errors';
import {dumpCollection as dumpCollectionUtil} from '@-/diffbelt-util/src/queries/dump';
import {testEmptyStringValue} from './empty-string-value';
import {NonManualCommitRunner} from './non-manual-commit';
import {CreateDatabaseFn} from './types';
import {mapFilterTest} from './map-filter';
import {aggregateByTimestampTest} from './aggregate-by-timestamp';
import {uniqueCounterTest} from './unique-counter';
import {percentilesTest} from './percentiles';

export const databaseTest = <Db extends Database>({
  createDatabase,
  afterComplexTest,
}: {
  createDatabase: CreateDatabaseFn<Db>;
  afterComplexTest?: (options: {
    database: Db;
    commitRunner: NonManualCommitRunner;
  }) => Promise<void>;
}) => {
  it('should pass complex database test', async () => {
    const {database, commitRunner} = await createDatabase();

    {
      const {collections} = await database.listCollections();
      expect(collections).toStrictEqual([]);
    }

    await database.createCollection({name: 'colA', generationId: '01'});
    const colA = await database.getCollection('colA');

    await database.createCollection({
      name: 'colB',
      generationId: '',
    });

    {
      const {collections} = await database.listCollections();
      expect(collections.sort()).toStrictEqual(['colA', 'colB']);
    }

    {
      let thrown: unknown;

      try {
        await database.getCollection('colD');
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(NoSuchCollectionError);
    }

    const colB = await database.getCollection('colB');

    const initialDumps = await Promise.all([
      dumpCollection(colA),
      dumpCollection(colB),
    ]);

    initialDumps.forEach(({items}) => {
      expect(items).toStrictEqual([]);
    });

    // Let `colA` contain `timestamp -> number`
    // Then we'll group it to `colB` -- `timestamp(every 60 seconds) -> sum of numbers from colA`

    const initialItems = [
      {key: makeId(3), value: '2'},
      {key: makeId(65), value: '5'},
      {key: makeId(69), value: '11'},
      {key: makeId(70), value: '8'},
      {key: makeId(249), value: '13'},
      {key: makeId(270), value: '15'},
      {key: makeId(300), value: '42'},
    ];

    await colA.startGeneration({generationId: '00000000001'});

    const {generationId: firstPutGenerationId} = await colA.putMany({
      items: initialItems,
      generationId: '00000000001',
    });

    await colA.putMany({
      items: [
        {key: makeId(3), value: null},
        {key: makeId(70), value: '9'},
      ],
      generationId: firstPutGenerationId,
      phantomId: 'A',
    });
    await colA.putMany({
      items: [{key: makeId(70), value: '11'}],
      generationId: firstPutGenerationId,
      phantomId: 'B',
    });

    await colA.commitGeneration({generationId: '00000000001'});

    {
      const {items, generationId} = await dumpCollection(colA);
      expect(generationId >= firstPutGenerationId).toBe(true);

      expect(items).toStrictEqual(initialItems);
    }

    await colB.createReader({
      readerId: 'aToB',
      generationId: '',
      collectionName: 'colA',
    });

    const {generationId: firstTransformGenerationId} =
      await doTransformFromAtoB({
        colA,
        colB,
        expectedItems: [
          {
            key: makeId(3),
            fromValue: null,
            toValue: {value: '2'},
            intermediateValues: [],
          },
          {
            key: makeId(65),
            fromValue: null,
            toValue: {value: '5'},
            intermediateValues: [],
          },
          {
            key: makeId(69),
            fromValue: null,
            toValue: {value: '11'},
            intermediateValues: [],
          },
          {
            key: makeId(70),
            fromValue: null,
            toValue: {value: '8'},
            intermediateValues: [],
          },
          {
            key: makeId(249),
            fromValue: null,
            toValue: {value: '13'},
            intermediateValues: [],
          },
          {
            key: makeId(270),
            fromValue: null,
            toValue: {value: '15'},
            intermediateValues: [],
          },
          {
            key: makeId(300),
            fromValue: null,
            toValue: {value: '42'},
            intermediateValues: [],
          },
        ],
        expectedFromGenerationId: {value: '', encoding: undefined},
      });

    expect(firstTransformGenerationId).toBe(firstPutGenerationId);

    {
      const {items, generationId} = await dumpCollection(colB);
      expect(generationId).toBe(firstTransformGenerationId);

      expect(items).toStrictEqual([
        {key: makeId(0), value: String(2)},
        {key: makeId(60), value: String(5 + 11 + 8)},
        {key: makeId(240), value: String(13 + 15)},
        {key: makeId(300), value: String(42)},
      ]);
    }

    await colA.startGeneration({generationId: '00000000002'});

    // Add
    await colA.put({key: makeId(66), value: '7', generationId: '00000000002'});
    // Remove
    await colA.put({key: makeId(3), value: null, generationId: '00000000002'});
    // Update
    const {generationId: updateValueGenerationId} = await colA.put({
      key: makeId(270),
      value: '12',
      generationId: '00000000002',
    });

    await colA.commitGeneration({generationId: '00000000002'});

    {
      const {items, generationId} = await dumpCollection(colA);
      expect(generationId >= updateValueGenerationId).toBe(true);

      expect(items).toStrictEqual([
        {key: makeId(65), value: '5'},
        {key: makeId(66), value: '7'},
        {key: makeId(69), value: '11'},
        {key: makeId(70), value: '8'},
        {key: makeId(249), value: '13'},
        {key: makeId(270), value: '12'},
        {key: makeId(300), value: '42'},
      ]);
    }

    const {generationId: secondTransformGenerationId} =
      await doTransformFromAtoB({
        colA,
        colB,
        expectedItems: [
          {
            key: makeId(3),
            fromValue: {value: '2'},
            toValue: null,
            intermediateValues: [],
          },
          {
            key: makeId(66),
            fromValue: null,
            toValue: {value: '7'},
            intermediateValues: [],
          },
          {
            key: makeId(270),
            fromValue: {value: '15'},
            toValue: {value: '12'},
            intermediateValues: [],
          },
        ],
        expectedFromGenerationId: {
          value: firstTransformGenerationId,
          encoding: undefined,
        },
      });

    expect(secondTransformGenerationId).toBe(updateValueGenerationId);

    {
      const {items, generationId} = await dumpCollection(colB);
      expect(generationId >= secondTransformGenerationId).toBe(true);

      expect(items).toStrictEqual([
        {key: makeId(0), value: String(0)},
        {key: makeId(60), value: String(5 + 7 + 11 + 8)},
        {key: makeId(240), value: String(13 + 12)},
        {key: makeId(300), value: String(42)},
      ]);
    }

    await afterComplexTest?.({database, commitRunner});
  });

  it('should store empty string values', async () => {
    const {database, commitRunner} = await createDatabase();
    await testEmptyStringValue({database, commitRunner});
  });

  mapFilterTest({createDatabase});
  aggregateByTimestampTest({createDatabase});
  uniqueCounterTest({createDatabase});
  percentilesTest({createDatabase});
};

const makeId = (ts: number) => String(ts).padStart(11, '0');

const doTransformFromAtoB = async ({
  colA,
  colB,
  expectedItems,
  expectedFromGenerationId,
}: {
  colA: Collection;
  colB: Collection;
  expectedItems: DiffResultItems;
  expectedFromGenerationId: EncodedValue;
}) => {
  const {
    fromGenerationId,
    generationId: toGenerationId,
    items,
    cursorId: initialCursorId,
  } = await colA.diff({readerId: 'aToB', readerCollectionName: 'colB'});

  const normalizeGenerationId = (
    generationId: EncodedValue | null,
  ): EncodedValue => {
    if (generationId === null) {
      return {value: '', encoding: undefined};
    }

    return {encoding: undefined, ...generationId};
  };

  expect(normalizeGenerationId(fromGenerationId)).toStrictEqual(
    normalizeGenerationId(expectedFromGenerationId),
  );

  const dumpedBeforeGeneration = await dumpCollection(colB);

  await colB.startGeneration({generationId: toGenerationId});

  const actualItems: DiffResultItems = [];

  let cursorId = initialCursorId;

  let prevTs = -1;
  let prevTsDiff = 0;

  const save = async () => {
    if (prevTs === -1) {
      return;
    }

    const key = makeId(prevTs);

    const {item} = await colB.get({key});
    if (item) {
      const {value} = item;
      const valueN = parseInt(value, 10);
      await colB.put({
        key,
        value: String(valueN + prevTsDiff),
        generationId: toGenerationId,
      });
    } else {
      await colB.put({
        key,
        value: String(prevTsDiff),
        generationId: toGenerationId,
      });
    }

    prevTs = -1;
    prevTsDiff = 0;
  };

  const processItems = async (items: DiffResultItems) => {
    for (const item of items) {
      actualItems.push(item);

      const {key, fromValue, toValue: maybeLastValue} = item;

      const ts = parseInt(key, 10);
      const ts60 = ts - (ts % 60);

      const prevValue = parseInt(
        fromValue !== null ? fromValue.value : '0',
        10,
      );
      const lastValue = parseInt(
        maybeLastValue !== null ? maybeLastValue.value : '0',
        10,
      );

      if (prevTs !== ts60) {
        await save();
      }

      prevTs = ts60;
      prevTsDiff += lastValue - prevValue;
    }
  };

  await processItems(items);

  while (typeof cursorId === 'string') {
    const {
      generationId,
      items,
      cursorId: nextCursorId,
    } = await colA.readDiffCursor({cursorId});

    expect(generationId).toBe(toGenerationId);

    await processItems(items);

    cursorId = nextCursorId;
  }

  await save();

  const dumpedBeforeCommit = await dumpCollection(colB);

  expect(dumpedBeforeCommit).toStrictEqual(dumpedBeforeGeneration);

  await colB.commitGeneration({
    generationId: toGenerationId,
    updateReaders: [
      {
        readerId: 'aToB',
        generationId: toGenerationId,
      },
    ],
  });

  expect(actualItems).toStrictEqual(expectedItems);

  return {generationId: toGenerationId};
};

const dumpCollection = (collection: Collection) => {
  let initialGenerationId = '';

  return dumpCollectionUtil(collection, {
    onInitialQuery({generationId}) {
      initialGenerationId = generationId;
    },
    onReadCursor({generationId}) {
      expect(generationId).toBe(initialGenerationId);
    },
  });
};
