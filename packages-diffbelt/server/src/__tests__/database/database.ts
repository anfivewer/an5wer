import {
  Collection,
  Database,
  DiffResultItems,
} from '@-/diffbelt-types/src/database/types';
import {NoSuchCollectionError} from '@-/diffbelt-types/src/database/errors';
import {waitForGeneration} from '../../util/database/wait-for-generation';
import {dumpCollection as dumpCollectionUtil} from '../../util/database/queries/dump';

export const testDatabase = async ({database}: {database: Database}) => {
  {
    const {collections} = await database.listCollections();
    expect(collections).toStrictEqual([]);
  }

  await Promise.all([
    database.createCollection('colA'),
    database.createCollection('colB'),
  ]);

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

  const [colA, colB] = await Promise.all([
    database.getCollection('colA'),
    database.getCollection('colB'),
  ]);

  const initialDumps = await Promise.all([
    dumpCollection(colA),
    dumpCollection(colB),
  ]);

  initialDumps.forEach(({items}) => {
    expect(items).toStrictEqual([]);
  });

  const initialColAGenerationId = await colA.getGeneration();

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

  const {generationId: firstPutGenerationId} = await colA.putMany({
    items: initialItems,
  });

  await waitForGeneration({
    collection: colA,
    generationId: firstPutGenerationId,
  });

  {
    const {items, generationId} = await dumpCollection(colA);
    expect(generationId >= firstPutGenerationId).toBe(true);

    expect(items).toStrictEqual(initialItems);
  }

  await colB.createReader({
    readerId: 'aToB',
    generationId: initialColAGenerationId,
    collectionName: 'colA',
  });

  const {generationId: firstTransformGenerationId} = await doTransformFromAtoB({
    colA,
    colB,
    expectedItems: [
      {key: makeId(3), values: [null, '2']},
      {key: makeId(65), values: [null, '5']},
      {key: makeId(69), values: [null, '11']},
      {key: makeId(70), values: [null, '8']},
      {key: makeId(249), values: [null, '13']},
      {key: makeId(270), values: [null, '15']},
      {key: makeId(300), values: [null, '42']},
    ],
    expectedFromGenerationId: initialColAGenerationId,
  });

  await waitForGeneration({
    collection: colB,
    generationId: firstTransformGenerationId,
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

  // Add
  await colA.put({key: makeId(66), value: '7'});
  // Remove
  await colA.put({key: makeId(3), value: null});
  // Update
  const {generationId: updateValueGenerationId} = await colA.put({
    key: makeId(270),
    value: '12',
  });

  await waitForGeneration({
    collection: colA,
    generationId: updateValueGenerationId,
  });

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

  const {generationId: secondTransformGenerationId} = await doTransformFromAtoB(
    {
      colA,
      colB,
      expectedItems: [
        {key: makeId(3), values: ['2', null]},
        {key: makeId(66), values: [null, '7']},
        {key: makeId(270), values: ['15', '12']},
      ],
      expectedFromGenerationId: firstTransformGenerationId,
    },
  );

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
  expectedFromGenerationId: string;
}) => {
  const {
    fromGenerationId,
    generationId: toGenerationId,
    items,
    cursorId: initialCursorId,
  } = await colA.diff({readerId: 'aToB', readerCollectionName: 'colB'});

  expect(fromGenerationId).toBe(expectedFromGenerationId);

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

      const {key, values} = item;

      const ts = parseInt(key, 10);
      const ts60 = ts - (ts % 60);

      const prevValue = parseInt(values[0] || '0', 10);
      const lastValue = parseInt(values[values.length - 1] || '0', 10);

      if (prevTs !== ts60) {
        await save();
      }

      prevTs = ts60;
      prevTsDiff += lastValue - prevValue;
    }
  };

  await processItems(items);

  while (cursorId) {
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
