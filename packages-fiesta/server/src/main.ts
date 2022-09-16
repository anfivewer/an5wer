import {Logger} from '@-/util/src/logging/logger';
import {IOError} from '@-/types/src/errors/io';
import './config';
import {createContext} from './context/context';
import {getConfig} from './config';
import {siteRendererDependency} from './context/dependencies';
import {registerRootRoute} from './routes/root';
import {SiteRendererDev} from './site/renderer-dev';
import {Config} from './types/config';
import {mkdir, stat as fsStat} from 'fs/promises';
import {Stats} from 'fs';

const PORT = 3001;

const mainLogger = new Logger('main');
mainLogger.info('helloWorld');

(async () => {
  const config = getConfig({logger: mainLogger.fork('config')});
  mainLogger.setDebug(config.isDebug);

  const context = createContext({
    config,
    logger: mainLogger,
    getSiteRenderer: config.isDev ? () => new SiteRendererDev() : undefined,
  });

  await ensureDataFolderExists({config});

  const {httpServer: server} = context;

  context.registerOnInit(async () => {
    await context.dependenciesGraph.onCompleted([siteRendererDependency]);

    registerRootRoute({context, logger: mainLogger.fork('/')});
  });

  await context.init();

  await server.listen(PORT);

  mainLogger.info('started', {port: PORT});
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
