import {HttpServer} from '@-/util/src/http-server/http-server';
import {Logger} from '@-/types/src/logging/logging';
import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {SiteVersion} from '../site-version/site-version';
import {Config} from '@-/fiesta-types/src/server/config';
import {SiteRenderer} from '../site/types';
import {Database} from '@-/fiesta-types/src/database/database';
import {DirectusComponent} from '@-/directus-fiesta/src/component';

export type Context = {
  mainLogger: Logger;
  config: Config;
  httpServer: HttpServer;
  siteVersion: SiteVersion;
  siteRenderer: SiteRenderer;
  dependenciesGraph: DependenciesGraph;
  database: Database;

  directus: DirectusComponent<Context>;
  directusUrlInternal: string;
};
