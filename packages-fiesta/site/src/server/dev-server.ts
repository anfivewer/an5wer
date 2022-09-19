import {FiestaRenderFun} from '@-/fiesta-types/src/site/render';
import {IncomingMessage, ServerResponse} from 'http';
import {resolve} from 'path';
import {createServer as createViteServer} from 'vite';

export type ViteMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void,
) => void;

export const createViteDevServer = async () => {
  const vite = await createViteServer({
    configFile: resolve(__dirname, '../../vite-client.config.ts'),
    server: {middlewareMode: 'ssr'},
  });

  const viteRender: FiestaRenderFun = async (options) => {
    const {
      request: {url},
    } = options;

    try {
      const ssrModule = await vite.ssrLoadModule('/src/entries/server.tsx');
      const render: FiestaRenderFun = ssrModule.render;

      const appHtml = await render(options);

      const html = await vite.transformIndexHtml(url, appHtml);
      return html;
    } catch (e) {
      vite.ssrFixStacktrace(e instanceof Error ? e : new Error(String(e)));
      throw e;
    }
  };

  const middleware: ViteMiddleware = (req, res, next) => {
    vite.middlewares(req, res, next);
  };

  return {
    middleware,
    render: viteRender,
  };
};
