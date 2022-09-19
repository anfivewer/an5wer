import {Context} from '../types/context';
import {siteRendererDependency} from '../context/dependencies';
import {createViteDevServer} from '@-/fiesta-site/src/server/dev-server';
import {SiteRenderer} from './types';
import {FiestaRenderFun, RequestData} from '@-/fiesta-types/src/site/render';
import {FiestaRenderPage} from '@-/fiesta-types/src/site/pages';
import {Database} from '@-/fiesta-types/src/database/database';

export class SiteRendererDev implements SiteRenderer {
  private database!: Database;
  private _render?: FiestaRenderFun;

  async init({context}: {context: Context}) {
    const {httpServer, dependenciesGraph, database} = context;

    this.database = database;

    const {middleware, render} = await createViteDevServer();

    this._render = render;

    httpServer.addRawMiddleware(middleware);

    dependenciesGraph.markCompleted(siteRendererDependency);
  }

  render({
    page,
    request,
  }: {
    page: FiestaRenderPage;
    request: RequestData;
  }): Promise<string> {
    return this._render!({
      manifest: undefined,
      page,
      request,
      clientBuildPath: '',
      stylesCache: new Map(),
      database: this.database,
    });
  }
}
