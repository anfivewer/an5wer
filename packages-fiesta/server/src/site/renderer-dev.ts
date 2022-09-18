import {Context} from '../types/context';
import {siteRendererDependency} from '../context/dependencies';
import {
  FiestaRenderFun,
  FiestaRenderPage,
  RequestData,
} from '@-/fiesta-site/src/entries/types';
import {createViteDevServer} from '@-/fiesta-site/src/server/dev-server';
import {SiteRenderer} from './types';

export class SiteRendererDev implements SiteRenderer {
  private _render?: FiestaRenderFun;

  async init({context}: {context: Context}) {
    const {httpServer, dependenciesGraph} = context;

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
    });
  }
}
