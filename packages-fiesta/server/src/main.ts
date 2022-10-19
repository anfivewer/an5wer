import {IOError} from '@-/types/src/errors/io';
import {createApp} from '@-/util/src/app/app';
import {runApp} from '@-/util/src/app/run';
import './config';
import {getConfig} from './config';
import {
  directusDependency,
  siteRendererDependency,
} from './context/dependencies';
import {registerRootRoute} from './routes/root';
import {Config} from '@-/fiesta-types/src/server/config';
import {mkdir, stat as fsStat} from 'fs/promises';
import {Stats} from 'fs';
import {registerDirectusRoute} from './routes/directus';
import {DirectusComponent} from '@-/directus-fiesta/src/component';
import {HttpServer} from '@-/util/src/http-server/http-server';
import {createInitialContext} from './context/context';
import {DirectusDatabase} from './database/directus/database';
import {SiteVersion} from './site-version/site-version';
import {SiteRendererProd} from './site/renderer';
import {SiteRendererDev} from './site/renderer-dev';
import {registerAdminRoute} from './routes/admin';

runApp({
  createApp: ({logger}) =>
    createApp({
      getLogger: () => logger,
      getConfig: ({logger}) => getConfig({logger}),
      setupLoggerByConfig: ({logger, config}) => {
        logger.setDebug(config.isDebug);
      },
      getInitialContext: createInitialContext,
      preInit: async ({app, config}) => {
        const {isDev, serverPort, directusPort, directusPath} = config;

        await ensureDataFolderExists({config});

        app.registerComponent({
          name: 'database',
          loggerKey: 'db',
          getComponent: ({logger}) => new DirectusDatabase({logger}),
        });

        app.registerComponent({
          name: 'siteVersion',
          loggerKey: 'site-ver',
          getComponent: ({logger}) => new SiteVersion({logger}),
        });

        app.registerComponent({
          name: 'siteRenderer',
          loggerKey: 'site-render',
          getComponent: ({logger}) =>
            isDev ? new SiteRendererDev() : new SiteRendererProd({logger}),
        });

        app.registerComponent({
          name: 'httpServer',
          loggerKey: 'http',
          getComponent: ({logger}) =>
            new HttpServer({port: serverPort, logger}),
        });

        app.registerComponent({
          name: 'directus',
          getComponent: () =>
            new DirectusComponent({
              publicPath: `${directusPath}/`,
              port: directusPort,
              onInit: ({context}) => {
                context.directusUrlInternal = `http://127.0.0.1:${directusPort}/`;
                return Promise.resolve();
              },
            }),
          afterInit: ({context}) => {
            context.dependenciesGraph.markCompleted(directusDependency);
            return Promise.resolve();
          },
        });

        app.registerOnInit(async ({context}) => {
          await context.dependenciesGraph.onCompleted([directusDependency]);

          registerDirectusRoute({
            context,
            logger: logger.fork('directus'),
            directusPort,
          });
        });

        app.registerOnInit(async ({context}) => {
          registerDirectusRoute({
            context,
            logger: logger.fork('directus'),
            directusPort,
          });

          await context.dependenciesGraph.onCompleted([siteRendererDependency]);

          registerRootRoute({context, logger: logger.fork('/')});
          registerAdminRoute({context, logger: logger.fork('/admin/')});
        });
      },
    }),
  afterReady: ({context}) => context.directus.getRunningDirectusPromise(),
});

async function ensureDataFolderExists({config}: {config: Config}) {
  const {dataPath} = config;

  let stat: Stats;

  try {
    stat = await fsStat(dataPath);
  } catch (e) {
    const maybeIoError = IOError.safeParse(e);
    if (maybeIoError.success && maybeIoError.data.code === 'ENOENT') {
      await mkdir(dataPath, {recursive: true});
      return;
    }

    throw e;
  }

  if (!stat.isDirectory()) {
    throw new Error(`${dataPath} is not a directory`);
  }
}
