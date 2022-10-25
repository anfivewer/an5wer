import {
  Collection,
  Database,
  DiffResultItems,
} from '@-/diffbelt-types/src/database/types';
import {NoSuchCollectionError} from '@-/diffbelt-types/src/database/errors';
import {waitForGeneration} from '../../util/database/wait-for-generation';

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

  const colC = await database.getCollection('colC', {createIfAbsent: true});

  {
    const {collections} = await database.listCollections();
    expect(collections.sort()).toStrictEqual(['colA', 'colB', 'colC']);
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
    dumpCollection(colC),
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

  await colA.createReader({id: 'aToB'});

  const {generationId: firstTransformGenerationId} = await doTransformFromAtoB({
    colA,
    colB,
    expectedItems: [
      /*TODO*/
    ],
  });

  expect(firstTransformGenerationId).toBe(firstPutGenerationId);

  {
    const {items, generationId} = await dumpCollection(colA);
    expect(generationId >= firstTransformGenerationId).toBe(true);

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
        /*TODO*/
      ],
    },
  );

  expect(secondTransformGenerationId).toBe(updateValueGenerationId);

  {
    const {items, generationId} = await dumpCollection(colA);
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
}: {
  colA: Collection;
  colB: Collection;
  expectedItems: DiffResultItems;
}) => {
  const {
    generationId: toGenerationId,
    items,
    cursorId: initialCursorId,
  } = await colA.diff({readerId: 'aToB'});

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

  await colB.commitGeneration({
    generationId: toGenerationId,
    updateReaders: [
      {
        collectionName: colA.getName(),
        readerId: 'aToB',
        generationId: toGenerationId,
      },
    ],
  });

  expect(actualItems).toStrictEqual(expectedItems);

  return {generationId: toGenerationId};
};

const dumpCollection = async (collection: Collection) => {
  const {
    generationId: initialGenerationId,
    items,
    cursorId,
  } = await collection.query();

  const allItems = items.slice();
  let currentCursor = cursorId;

  while (currentCursor) {
    const {generationId, items, cursorId} = await collection.readQueryCursor({
      cursorId: currentCursor,
    });

    items.forEach((item) => {
      allItems.push(item);
    });

    expect(generationId).toBe(initialGenerationId);

    currentCursor = cursorId;
  }

  return {items: allItems, generationId: initialGenerationId};
};
