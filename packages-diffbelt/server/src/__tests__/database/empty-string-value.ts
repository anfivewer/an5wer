import {Database, KeyValue} from '@-/diffbelt-types/src/database/types';
import {queryCollection} from '@-/diffbelt-util/src/queries/dump';
import {waitForGeneration} from '../../util/database/wait-for-generation';
import {NonManualCommitRunner} from './non-manual-commit';

export const testEmptyStringValue = async ({
  database,
  commitRunner,
}: {
  database: Database;
  commitRunner: NonManualCommitRunner;
}) => {
  await database.createCollection('testEmptyStringValue');
  const collection = await database.getCollection('testEmptyStringValue');

  const {generationId} = await collection.put({key: 'test', value: ''});
  commitRunner.makeCommits();
  await waitForGeneration({collection, generationId});

  const {stream} = await queryCollection(collection);

  const allItems: KeyValue[] = [];

  for await (const items of stream) {
    items.forEach((item) => {
      allItems.push(item);
    });
  }

  expect(allItems).toStrictEqual([{key: 'test', value: ''}]);
};
