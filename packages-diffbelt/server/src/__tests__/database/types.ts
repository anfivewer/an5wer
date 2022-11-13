import {Database} from '@-/diffbelt-types/src/database/types';
import {NonManualCommitRunner} from './non-manual-commit';

export type CreateDatabaseFn<Db extends Database = Database> = () => Promise<{
  database: Db;
  commitRunner: NonManualCommitRunner;
}>;
