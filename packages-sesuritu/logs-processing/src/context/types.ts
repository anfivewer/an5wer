import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {Config} from '../config/types';
import {Database} from '../database/database';

export type Context = {
  config: Config;
  dependenciesGraph: DependenciesGraph;
  database: Database;
};
