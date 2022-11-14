import {createProxyServer} from 'http-proxy';
import {Logger} from '@-/types/src/logging/logging';
import {Context} from '../types/context';

export const registerDirectusRoute = ({
  context,
  directusPort,
}: {
  context: Context;
  logger: Logger;
  directusPort: number;
}) => {
  const {
    httpServer,
    config: {directusPath: directusPathRaw},
  } = context;

  const proxy = createProxyServer();

  const directusPath = `${directusPathRaw}/`;
  const pathRegexp = new RegExp(`^${directusPath}`);

  proxy.on('proxyReq', function (proxyReq) {
    proxyReq.path = proxyReq.path.replace(pathRegexp, '/');
  });

  httpServer.addRawMiddleware((req, res, next) => {
    if (!req.url?.startsWith(directusPath)) {
      next();
      return;
    }

    if (req.method === 'POST' || req.method === 'PATCH') {
      const subUrl = req.url.slice(directusPath.length);

      if (/^items\/kv\/site-version(?:\?.*|$)/.test(subUrl)) {
        context.siteVersion.onVersionUpdated();
      }
    }

    proxy.web(req, res, {target: `http://127.0.0.1:${directusPort}`});
  });
};
