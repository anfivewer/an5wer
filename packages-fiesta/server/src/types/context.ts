import {HttpServer} from '@-/util/src/http-server/http-server';
import {Logger} from '@-/util/src/logging/types';
import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {SiteVersion} from '../site-version/site-version';
import {Config} from './config';
import {SiteRenderer} from '../site/types';

export type Context = {
  mainLogger: Logger;
  config: Config;
  httpServer: HttpServer;
  siteVersion: SiteVersion;
  siteRenderer: SiteRenderer;
  dependenciesGraph: DependenciesGraph;

  registerOnInit: (fun: () => Promise<void>) => void;
  init: () => Promise<void>;
};
