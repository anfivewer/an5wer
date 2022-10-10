import {createProxyServer} from 'http-proxy';
import {Logger} from '@-/util/src/logging/types';
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
    config: {directusPublicPath},
  } = context;

  const proxy = createProxyServer();

  const pathRegexp = new RegExp(`^${directusPublicPath}`);

  proxy.on('proxyReq', function (proxyReq) {
    proxyReq.path = proxyReq.path.replace(pathRegexp, '/');
  });

  httpServer.addRawMiddleware((req, res, next) => {
    if (!req.url?.startsWith(directusPublicPath)) {
      next();
      return;
    }

    if (req.method === 'POST' || req.method === 'PATCH') {
      const subUrl = req.url.slice(directusPublicPath.length);

      if (/^items\/kv\/site-version(?:\?.*|$)/.test(subUrl)) {
        context.siteVersion.onVersionUpdated();
      }
    }

    proxy.web(req, res, {target: `http://127.0.0.1:${directusPort}`});
  });
};
