import {Database, KeyValue} from '@-/diffbelt-types/src/database/types';
import {queryCollection} from '@-/diffbelt-util/src/queries/dump';
import {NonManualCommitRunner} from './non-manual-commit';

export const testEmptyStringValue = async ({
  database,
}: {
  database: Database;
  commitRunner: NonManualCommitRunner;
}) => {
  await database.createCollection({
    name: 'testEmptyStringValue',
    generationId: {value: ''},
  });
  const collection = await database.getCollection('testEmptyStringValue');

  await collection.startGeneration({generationId: {value: '1'}});
  await collection.put({
    item: {
      key: {value: 'test'},
      value: {value: ''},
    },
    generationId: {value: '1'},
  });
  await collection.commitGeneration({generationId: {value: '1'}});

  const {stream} = await queryCollection(collection);

  const allItems: KeyValue[] = [];

  for await (const items of stream) {
    items.forEach((item) => {
      allItems.push(item);
    });
  }

  expect(allItems).toStrictEqual([{key: {value: 'test'}, value: {value: ''}}]);
};
