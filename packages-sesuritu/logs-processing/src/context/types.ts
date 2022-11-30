import {Logger} from '@-/types/src/logging/logging';
import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {Config} from '../config/types';
import {Database} from '../database/database';

export type Context = {
  logger: Logger;
  config: Config;
  dependenciesGraph: DependenciesGraph;
  database: Database;
  needDumpDatabaseOnStop: boolean;
};
