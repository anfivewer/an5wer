import {Logger} from '@-/util/src/logging/logger';
import './config';
import {createContext} from './context/context';
import {getConfig} from './config';
import {registerPrivateRoute} from './routes/private';

const mainLogger = new Logger('main');
mainLogger.info('helloWorld');

(async () => {
  const config = getConfig({logger: mainLogger.fork('config')});
  mainLogger.setDebug(config.isDebug);

  const context = createContext({
    config,
    logger: mainLogger,
  });

  const {httpServer: server} = context;

  context.registerOnInit(() => {
    registerPrivateRoute({context, logger: mainLogger.fork('private')});
    return Promise.resolve();
  });

  await context.init();

  await server.listen(config.httpPort);

  mainLogger.info('started', {port: config.httpPort});
})().catch((error) => {
  mainLogger.error('start', undefined, {error});
});
