import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {Config} from '../config/types';

export type Context = {
  config: Config;
  dependenciesGraph: DependenciesGraph;
};
