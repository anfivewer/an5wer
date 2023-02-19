import {databaseTest} from './database/database';
import {NonManualCommitRunner} from './database/non-manual-commit';
import {Database} from '@-/diffbelt-client/src/http/database';
import {IdlingStatus} from '@-/util/src/state/idling-status';

describe('DatabaseClient', () => {
  databaseTest({
    createDatabase: () => {
      const idling = new IdlingStatus();

      const commitRunner = new NonManualCommitRunner({
        getDatabaseIdling: () => idling,
      });

      const database = new Database({
        url: 'http://127.0.0.1:3030',
      });

      return Promise.resolve({database, commitRunner});
    },
  });
});
