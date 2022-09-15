import {Logger} from '@-/util/src/logging/logger';
import './config';
import {createContext} from './context/context';
import {getConfig} from './config';
import {siteRendererDependency} from './context/dependencies';
import {registerRootRoute} from './routes/root';
import {SiteRendererDev} from './site/renderer-dev';

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
});
