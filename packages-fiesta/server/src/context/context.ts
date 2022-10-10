import {GetInitialContextFn} from '@-/types/src/app/app';
import {notInitializedContextValue} from '@-/types/src/app/context';
import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {Config} from '../types/config';
import {Context} from '../types/context';

export const createInitialContext: GetInitialContextFn<Config, Context> = ({
  config,
  logger,
}) => ({
  mainLogger: logger,
  config,
  dependenciesGraph: new DependenciesGraph(),
  httpServer: notInitializedContextValue,
  siteVersion: notInitializedContextValue,
  siteRenderer: notInitializedContextValue,
  directus: notInitializedContextValue,
  directusUrlInternal: '',
  database: notInitializedContextValue,
});
