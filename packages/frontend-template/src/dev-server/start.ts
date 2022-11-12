import {createViteDevServer} from './dev-server';
import {HttpServer} from '@-/util/src/http-server/http-server';
import {Logger} from '@-/util/src/logging/logger';
import {SiteRenderPage} from '@-/app-types-template/src/site/pages';
import {HttpResultType} from '@-/util/src/http-server/types';

async function main() {
  const logger = new Logger('root');
  logger.info('helloWorld');

  const {middleware, render} = await createViteDevServer();

  const http = new HttpServer({port: 3000, logger: logger.fork('http')});

  http.routesGet.addStaticRoute('/', {
    handler: async () => {
      const html = await render({
        manifest: undefined,
        page: SiteRenderPage.main,
        request: {
          url: '/',
        },
        clientBuildPath: '',
        stylesCache: new Map(),
      });

      return {
        type: HttpResultType.html,
        html,
      };
    },
  });

  http.addRawMiddleware(middleware);

  await http.listen(3000);

  logger.info('httpListen', {port: 3000});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
