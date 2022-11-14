import {GetInitialContextFn} from '@-/types/src/app/app';
import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {Config} from '../config/types';
import {Context} from './types';

export const createInitialContext: GetInitialContextFn<Config, Context> = ({
  logger,
  config,
}) => ({
  config,
  logger,
  dependenciesGraph: new DependenciesGraph(),
});
