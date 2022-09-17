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

(async () => {
  const config = getConfig({logger: mainLogger.fork('config')});
  const {isDev, isDebug, directusPublicPath} = config;

  mainLogger.setDebug(isDebug);

  const context = createContext({
    config,
    logger: mainLogger,
    getSiteRenderer: isDev ? () => new SiteRendererDev() : undefined,
  });

  await ensureDataFolderExists({config});

  const {httpServer: server} = context;

  const {port: directusPort, runningDirectusPromise} = await startDirectus({
    publicUrl: directusPublicPath,
  });

  context.registerOnInit(async () => {
    registerDirectusRoute({
      context,
      logger: mainLogger.fork('directus'),
      directusPort,
    });

    await context.dependenciesGraph.onCompleted([siteRendererDependency]);

    registerRootRoute({context, logger: mainLogger.fork('/')});
  });

  //

  await context.init();

  await server.listen(PORT);

  mainLogger.info('started', {port: PORT});

  await runningDirectusPromise;
})().catch((error) => {
  mainLogger.error('start', undefined, {error});

  // FIXME: shutdown initialized components
  process.exit(1);
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
