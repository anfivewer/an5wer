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

    proxy.web(req, res, {target: `http://127.0.0.1:${directusPort}`});
  });
};
