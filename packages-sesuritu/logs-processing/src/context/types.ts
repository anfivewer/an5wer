import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {Config} from '../config/types';
import {MemoryDatabase} from '@-/diffbelt-server/src/database/memory/database';

export type Context = {
  config: Config;
  dependenciesGraph: DependenciesGraph;
  database: MemoryDatabase;
};
