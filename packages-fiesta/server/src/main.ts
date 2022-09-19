import {Logger} from '@-/util/src/logging/logger';
import {IOError} from '@-/types/src/errors/io';
import {startDirectus} from '@-/directus-fiesta/src/start';
import './config';
import {createContext} from './context/context';
import {getConfig} from './config';
import {siteRendererDependency} from './context/dependencies';
import {registerRootRoute} from './routes/root';
import {SiteRendererDev} from './site/renderer-dev';
import {Config} from './types/config';
import {mkdir, stat as fsStat} from 'fs/promises';
import {Stats} from 'fs';
import {registerDirectusRoute} from './routes/directus';

const PORT = 3001;

const mainLogger = new Logger('main');
mainLogger.info('helloWorld');

let config: Config | undefined;
const shutdownCallbacks: (() => Promise<void>)[] = [];

const shutdownServer = async () => {
  const timeoutId = setTimeout(() => {
    mainLogger.error('shutdown:timeout');

    if (config?.isDev || config?.isDebug) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requests = (process as any)._getActiveRequests();
        console.error(requests);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handles = (process as any)._getActiveHandles();
        console.error(handles);
      } catch (error) {
        //
      }
    }

    process.exit(1);
  }, 3000);

  await Promise.all(
    shutdownCallbacks.map((fun) =>
      fun().catch((error) => {
        mainLogger.error('shutdown', undefined, {error});
      }),
    ),
  );

  clearTimeout(timeoutId);

  process.exit(0);
};

(async () => {
  config = getConfig({logger: mainLogger.fork('config')});
  const {isDev, isDebug, directusPublicPath} = config;

  mainLogger.setDebug(isDebug);

  const context = createContext({
    config,
    logger: mainLogger,
    getSiteRenderer: isDev ? () => new SiteRendererDev() : undefined,
  });

  await ensureDataFolderExists({config});

  const {httpServer: server} = context;

  const {
    port: directusPort,
    runningDirectusPromise,
    shutdown,
  } = await startDirectus({
    publicPath: directusPublicPath,
  });

  context.directusUrlInternal = `http://127.0.0.1:${directusPort}/`;

  shutdownCallbacks.push(shutdown);
  shutdownCallbacks.push(() => runningDirectusPromise);

  context.registerOnInit(async () => {
    registerDirectusRoute({
      context,
      logger: mainLogger.fork('directus'),
      directusPort,
    });

    await context.dependenciesGraph.onCompleted([siteRendererDependency]);

    registerRootRoute({context, logger: mainLogger.fork('/')});
  });

  await context.init();

  shutdownCallbacks.push(server.stop.bind(server));
  await server.listen(PORT);

  mainLogger.info('started', {port: PORT});

  await runningDirectusPromise;
})().catch(async (error) => {
  mainLogger.error('start', undefined, {error});

  await shutdownServer();
});

process.on('SIGINT', () => {
  shutdownServer();
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
