import {cloneStream} from '@-/util/src/stream/clone';
import {waitForGeneration} from '../../util/database/wait-for-generation';
import {databaseTest} from '../../__tests__/database/database';
import {NonManualCommitRunner} from '../../__tests__/database/non-manual-commit';
import {MemoryDatabase} from './database';
import {dumpMemoryDatabase} from './persist/dump';
import {restoreMemoryDatabase} from './persist/restore';

describe('MemoryDatabase', () => {
  databaseTest({
    createDatabase: () => {
      // eslint-disable-next-line prefer-const
      let database: MemoryDatabase;
      const commitRunner = new NonManualCommitRunner({
        getDatabaseIdling: () => database._idling,
      });
      database = new MemoryDatabase({
        maxItemsInPack: 100,
        waitForNonManualGenerationCommit:
          commitRunner.waitForNonManualGenerationCommit.bind(commitRunner),
      });

      return Promise.resolve({database, commitRunner});
    },
    afterComplexTest: async ({database, commitRunner}) => {
      const stream = await dumpMemoryDatabase({database});

      const buffers: Buffer[] = [];

      for await (const buffer of cloneStream(stream)) {
        buffers.push(buffer);
      }

      const expectedDump =
        '{"type":"header","version":1}\n' +
        '{"type":"collection","name":"colA","generationId":"00000000002",' +
        '"nextGenerationId":"00000000003",' +
        '"isManual":false}\n{"type":"generation","collectionName":"colA",' +
        '"generationId":"00000000001","changedKeys":["00000000003",' +
        '"00000000065","00000000069","00000000070","00000000249",' +
        '"00000000270","00000000300"]}\n{"type":"generation",' +
        '"collectionName":"colA","generationId":"00000000002",' +
        '"changedKeys":["00000000003","00000000066","00000000270"]}\n' +
        '{"type":"readers","collectionName":"colA","readers":[]}\n' +
        '{"type":"items","collectionName":"colA","items":[{"key":"00000000003",' +
        '"value":"2","generationId":"00000000001"},{"key":"00000000003",' +
        '"value":null,"generationId":"00000000002"},{"key":"00000000065",' +
        '"value":"5","generationId":"00000000001"},{"key":"00000000066",' +
        '"value":"7","generationId":"00000000002"},{"key":"00000000069",' +
        '"value":"11","generationId":"00000000001"},{"key":"00000000070",' +
        '"value":"8","generationId":"00000000001"},{"key":"00000000249",' +
        '"value":"13","generationId":"00000000001"},{"key":"00000000270",' +
        '"value":"15","generationId":"00000000001"},{"key":"00000000270",' +
        '"value":"12","generationId":"00000000002"},{"key":"00000000300",' +
        '"value":"42","generationId":"00000000001"}]}\n' +
        '{"type":"collection","name":"colB","generationId":"00000000002",' +
        '"isManual":true}\n{"type":"generation","collectionName":"colB",' +
        '"generationId":"00000000001","changedKeys":["00000000000",' +
        '"00000000060","00000000240","00000000300"]}\n{"type":"generation",' +
        '"collectionName":"colB","generationId":"00000000002","changedKeys"' +
        ':["00000000000","00000000060","00000000240"]}\n' +
        '{"type":"readers","collectionName":"colB","readers":[{"readerId":' +
        '"aToB","generationId":"00000000002","collectionName":"colA"}]}\n' +
        '{"type":"items","collectionName":"colB","items":[{"key":"00000000000",' +
        '"value":"2","generationId":"00000000001"},{"key":"00000000000",' +
        '"value":"0","generationId":"00000000002"},{"key":"00000000060",' +
        '"value":"24","generationId":"00000000001"},{"key":"00000000060",' +
        '"value":"31","generationId":"00000000002"},{"key":"00000000240",' +
        '"value":"28","generationId":"00000000001"},{"key":"00000000240",' +
        '"value":"25","generationId":"00000000002"},{"key":"00000000300",' +
        '"value":"42","generationId":"00000000001"}]}\n{"type":"end"}\n';

      const actualDump = Buffer.concat(buffers).toString('utf8');

      expect(actualDump).toBe(expectedDump);

      // Change some value
      let colA = await database.getCollection('colA');
      const {generationId} = await colA.put({key: '00000000070', value: '100'});

      await commitRunner.makeCommits();
      await waitForGeneration({collection: colA, generationId});

      await restoreMemoryDatabase({database, dump: stream});

      // After restore value change should be reset
      colA = await database.getCollection('colA');
      const {item, generationId: actualGenerationId} = await colA.get({
        key: '00000000070',
        generationId,
      });

      expect(actualGenerationId).toBe('00000000001');
      expect(item).toStrictEqual({key: '00000000070', value: '8'});
    },
  });
});
