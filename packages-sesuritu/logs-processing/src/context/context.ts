import {GetInitialContextFn} from '@-/types/src/app/app';
import {notInitializedContextValue} from '@-/types/src/app/context';
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
  database: notInitializedContextValue,
});
