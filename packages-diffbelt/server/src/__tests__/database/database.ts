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
import {toString} from '@-/diffbelt-util/src/keys/encoding';
import {isGreaterOrEqualThan} from '@-/diffbelt-util/src/keys/compare';

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

    await database.createCollection({
      name: 'colA',
      generationId: {value: '01'},
    });
    const colA = await database.getCollection('colA');

    await database.createCollection({
      name: 'colB',
      generationId: {value: ''},
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
      {key: {value: makeId(3)}, value: {value: '2'}},
      {key: {value: makeId(65)}, value: {value: '5'}},
      {key: {value: makeId(69)}, value: {value: '11'}},
      {key: {value: makeId(70)}, value: {value: '8'}},
      {key: {value: makeId(249)}, value: {value: '13'}},
      {key: {value: makeId(270)}, value: {value: '15'}},
      {key: {value: makeId(300)}, value: {value: '42'}},
    ];

    await colA.startGeneration({generationId: {value: '00000000001'}});

    const {generationId: firstPutGenerationId} = await colA.putMany({
      items: initialItems,
      generationId: {value: '00000000001'},
    });

    await colA.putMany({
      items: [
        {key: {value: makeId(3)}, value: null},
        {key: {value: makeId(70)}, value: {value: '9'}},
      ],
      generationId: firstPutGenerationId,
      phantomId: {value: 'A'},
    });
    await colA.putMany({
      items: [{key: {value: makeId(70)}, value: {value: '11'}}],
      generationId: firstPutGenerationId,
      phantomId: {value: 'B'},
    });

    await colA.commitGeneration({generationId: {value: '00000000001'}});

    {
      const {items, generationId} = await dumpCollection(colA);
      expect(generationId >= firstPutGenerationId).toBe(true);

      expect(items).toStrictEqual(initialItems);
    }

    await colB.createReader({
      readerName: 'aToB',
      generationId: {value: ''},
      collectionName: 'colA',
    });

    const {generationId: firstTransformGenerationId} =
      await doTransformFromAtoB({
        colA,
        colB,
        expectedItems: [
          {
            key: {value: makeId(3)},
            fromValue: null,
            toValue: {value: '2'},
            intermediateValues: [],
          },
          {
            key: {value: makeId(65)},
            fromValue: null,
            toValue: {value: '5'},
            intermediateValues: [],
          },
          {
            key: {value: makeId(69)},
            fromValue: null,
            toValue: {value: '11'},
            intermediateValues: [],
          },
          {
            key: {value: makeId(70)},
            fromValue: null,
            toValue: {value: '8'},
            intermediateValues: [],
          },
          {
            key: {value: makeId(249)},
            fromValue: null,
            toValue: {value: '13'},
            intermediateValues: [],
          },
          {
            key: {value: makeId(270)},
            fromValue: null,
            toValue: {value: '15'},
            intermediateValues: [],
          },
          {
            key: {value: makeId(300)},
            fromValue: null,
            toValue: {value: '42'},
            intermediateValues: [],
          },
        ],
        expectedFromGenerationId: {value: '', encoding: undefined},
      });

    expect(firstTransformGenerationId).toStrictEqual(firstPutGenerationId);

    {
      const {items, generationId} = await dumpCollection(colB);
      expect(generationId).toStrictEqual(firstTransformGenerationId);

      expect(items).toStrictEqual([
        {key: {value: makeId(0)}, value: {value: String(2)}},
        {key: {value: makeId(60)}, value: {value: String(5 + 11 + 8)}},
        {key: {value: makeId(240)}, value: {value: String(13 + 15)}},
        {key: {value: makeId(300)}, value: {value: String(42)}},
      ]);
    }

    await colA.startGeneration({generationId: {value: '00000000002'}});

    // Add
    await colA.put({
      item: {
        key: {value: makeId(66)},
        value: {value: '7'},
      },
      generationId: {value: '00000000002'},
    });
    // Remove
    await colA.put({
      item: {
        key: {value: makeId(3)},
        value: null,
      },
      generationId: {value: '00000000002'},
    });
    // Update
    const {generationId: updateValueGenerationId} = await colA.put({
      item: {
        key: {value: makeId(270)},
        value: {value: '12'},
      },
      generationId: {value: '00000000002'},
    });

    await colA.commitGeneration({generationId: {value: '00000000002'}});

    {
      const {items, generationId} = await dumpCollection(colA);
      expect(isGreaterOrEqualThan(generationId, updateValueGenerationId)).toBe(
        true,
      );

      expect(items).toStrictEqual([
        {key: {value: makeId(65)}, value: {value: '5'}},
        {key: {value: makeId(66)}, value: {value: '7'}},
        {key: {value: makeId(69)}, value: {value: '11'}},
        {key: {value: makeId(70)}, value: {value: '8'}},
        {key: {value: makeId(249)}, value: {value: '13'}},
        {key: {value: makeId(270)}, value: {value: '12'}},
        {key: {value: makeId(300)}, value: {value: '42'}},
      ]);
    }

    const {generationId: secondTransformGenerationId} =
      await doTransformFromAtoB({
        colA,
        colB,
        expectedItems: [
          {
            key: {value: makeId(3)},
            fromValue: {value: '2'},
            toValue: null,
            intermediateValues: [],
          },
          {
            key: {value: makeId(66)},
            fromValue: null,
            toValue: {value: '7'},
            intermediateValues: [],
          },
          {
            key: {value: makeId(270)},
            fromValue: {value: '15'},
            toValue: {value: '12'},
            intermediateValues: [],
          },
        ],
        expectedFromGenerationId: firstTransformGenerationId,
      });

    expect(secondTransformGenerationId).toStrictEqual(updateValueGenerationId);

    {
      const {items, generationId} = await dumpCollection(colB);
      expect(
        isGreaterOrEqualThan(generationId, secondTransformGenerationId),
      ).toBe(true);

      expect(items).toStrictEqual([
        {key: {value: makeId(0)}, value: {value: String(0)}},
        {key: {value: makeId(60)}, value: {value: String(5 + 7 + 11 + 8)}},
        {key: {value: makeId(240)}, value: {value: String(13 + 12)}},
        {key: {value: makeId(300)}, value: {value: String(42)}},
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
    toGenerationId: initialToGenerationId,
    items,
    cursorId: initialCursorId,
  } = await colA.diff({
    fromReader: {readerName: 'aToB', collectionName: 'colB'},
  });

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

  await colB.startGeneration({generationId: initialToGenerationId});

  const actualItems: DiffResultItems = [];

  let cursorId = initialCursorId;

  let prevTs = -1;
  let prevTsDiff = 0;

  const save = async () => {
    if (prevTs === -1) {
      return;
    }

    const key = {value: makeId(prevTs)};

    const {item} = await colB.get({key});
    if (item) {
      const {value} = item;
      const valueN = parseInt(toString(value), 10);
      await colB.put({
        item: {
          key,
          value: {value: String(valueN + prevTsDiff)},
        },
        generationId: initialToGenerationId,
      });
    } else {
      await colB.put({
        item: {
          key,
          value: {value: String(prevTsDiff)},
        },
        generationId: initialToGenerationId,
      });
    }

    prevTs = -1;
    prevTsDiff = 0;
  };

  const processItems = async (items: DiffResultItems) => {
    for (const item of items) {
      actualItems.push(item);

      const {key, fromValue, toValue: maybeLastValue} = item;

      const ts = parseInt(toString(key), 10);
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
      toGenerationId,
      items,
      cursorId: nextCursorId,
    } = await colA.readDiffCursor({cursorId});

    expect(toGenerationId).toStrictEqual(initialToGenerationId);

    await processItems(items);

    cursorId = nextCursorId;
  }

  await save();

  const dumpedBeforeCommit = await dumpCollection(colB);

  expect(dumpedBeforeCommit).toStrictEqual(dumpedBeforeGeneration);

  await colB.commitGeneration({
    generationId: initialToGenerationId,
    updateReaders: [
      {
        readerName: 'aToB',
        generationId: initialToGenerationId,
      },
    ],
  });

  expect(actualItems).toStrictEqual(expectedItems);

  return {generationId: initialToGenerationId};
};

const dumpCollection = (collection: Collection) => {
  let initialGenerationId: EncodedValue = {value: ''};

  return dumpCollectionUtil(collection, {
    onInitialQuery({generationId}) {
      initialGenerationId = generationId;
    },
    onReadCursor({generationId}) {
      expect(generationId).toStrictEqual(initialGenerationId);
    },
  });
};
