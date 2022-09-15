import http, {IncomingMessage} from 'http';
import {createHttpHandler, HttpResultType} from '@-/util/src/http-server/types';
import {Context} from '../types/context';
import {Logger} from '@-/types/src/logging/logging';
import {Defer} from '@-/util/src/async/defer';

export const registerPrivateRoute = ({
  context,
  logger,
}: {
  context: Context;
  logger: Logger;
}) => {
  const {
    httpServer,
    sessions,
    config: {privateStaticsUrlPrefix},
  } = context;

  httpServer.routesGet.addRegexpRoute(
    /^\/s\/([a-f0-9]{32})\/(.+)$/,
    createHttpHandler({
      mapGroups: ([, bucketId, path]) => ({bucketId, path}),
      handler: async ({groups: {bucketId, path}, getHeader, getHeaders}) => {
        const auth = getHeader('authorization');
        const match = auth && /^Session ([a-f0-9]{64})$/.exec(auth);
        if (!match) {
          return {
            type: HttpResultType.raw as const,
            statusCode: 401,
            data: '401',
          };
        }

        const [, sessionId] = match;

        const isAllowed = sessions.checkSession({bucketId, sessionId});
        if (!isAllowed) {
          return {
            type: HttpResultType.raw as const,
            statusCode: 403,
            data: '403',
          };
        }

        const proxyToUrl = `${privateStaticsUrlPrefix}/${path}`;

        const responseDefer = new Defer<IncomingMessage>();

        const proxyReq = http.request(proxyToUrl, {
          method: 'GET',
          headers: getHeaders(),
        });
        proxyReq.on('error', (error) => {
          logger.error('proxy', undefined, {error});

          responseDefer.reject(new Error());
        });
        proxyReq.on('response', (res) => {
          responseDefer.resolve(res);
        });
        proxyReq.end();

        const res = await responseDefer.promise;

        return {
          type: HttpResultType.stream as const,
          statusCode: res.statusCode,
          headers: res.headers,
          stream: res,
        };
      },
    }),
  );
};
