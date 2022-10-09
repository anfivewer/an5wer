import {Logger} from '@-/util/src/logging/logger';
import {IOError} from '@-/types/src/errors/io';
import {createApp} from '@-/util/src/app/app';
import './config';
import {getConfig} from './config';
import {
  directusDependency,
  siteRendererDependency,
} from './context/dependencies';
import {registerRootRoute} from './routes/root';
import {Config} from './types/config';
import {mkdir, stat as fsStat} from 'fs/promises';
import {Stats} from 'fs';
import {registerDirectusRoute} from './routes/directus';
import {App} from '@-/types/src/app/app';
import {Context} from './types/context';
import {DirectusComponent} from '@-/directus-fiesta/src/component';
import {HttpServer} from '@-/util/src/http-server/http-server';
import {createInitialContext} from './context/context';
import {DirectusDatabase} from './database/directus/database';
import {SiteVersion} from './site-version/site-version';
import {SiteRendererProd} from './site/renderer';
import {SiteRendererDev} from './site/renderer-dev';

const mainLogger = new Logger('main');
let appGlobal: App<Context> | undefined;

const shutdown = (app: App<Context>) => {
  const context = app.getContext();

  app
    .stop({
      printHandlesOnTimeout: context?.config.isDebug,
    })
    .then(
      () => {
        process.exit(0);
      },
      (error) => {
        mainLogger.error('stop', undefined, {error});
        process.exit(1);
      },
    );
};

(async () => {
  const app = await createApp({
    getLogger: () => mainLogger,
    getConfig: ({logger}) => Promise.resolve(getConfig({logger})),
    setupLoggerByConfig: ({logger, config}) => {
      logger.setDebug(config.isDebug);
    },
    getInitialContext: createInitialContext,
    preInit: async ({config}) => {
      const {isDev, serverPort, directusPort, directusPublicPath} = config;

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
        getComponent: ({logger}) => new HttpServer({port: serverPort, logger}),
      });

      app.registerComponent({
        name: 'directus',
        getComponent: () =>
          new DirectusComponent({
            publicPath: directusPublicPath,
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
        registerDirectusRoute({
          context,
          logger: mainLogger.fork('directus'),
          directusPort,
        });

        await context.dependenciesGraph.onCompleted([siteRendererDependency]);

        registerRootRoute({context, logger: mainLogger.fork('/')});
      });
    },
  });

  appGlobal = app;

  const context = await app.init();

  mainLogger.info('started');

  process.send?.('ready');

  await context.directus.getRunningDirectusPromise();
})().catch((error) => {
  mainLogger.error('start', undefined, {error});

  if (appGlobal) {
    shutdown(appGlobal);
  }
});

process.on('SIGINT', () => {
  if (appGlobal) {
    shutdown(appGlobal);
  } else {
    process.exit(0);
  }
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
