import {HttpServer} from '@-/util/src/http-server/http-server';
import {Logger} from '@-/types/src/logging/logging';
import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {Config} from './config';
import {Sessions} from '../sessions/sessions';

export type Context = {
  mainLogger: Logger;
  config: Config;
  httpServer: HttpServer;
  dependenciesGraph: DependenciesGraph;
  sessions: Sessions;

  getUnixTimeSeconds: () => number;
  registerOnInit: (fun: () => Promise<void>) => void;
  init: () => Promise<void>;
};
