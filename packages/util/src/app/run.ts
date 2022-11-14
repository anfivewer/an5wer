import {App} from '@-/types/src/app/app';
import {Logger} from '../logging/logger';

export const runApp = <Context extends {config: {isDebug: boolean}}>({
  rootLoggerKey = 'main',
  createApp,
  afterReady,
}: {
  rootLoggerKey?: string;
  createApp: (options: {logger: Logger}) => Promise<App<Context>>;
  afterReady?: (options: {
    app: App<Context>;
    logger: Logger;
    context: Context;
  }) => Promise<void>;
}) => {
  const mainLogger = new Logger(rootLoggerKey);
  let appGlobal: App<Context> | undefined;

  const shutdown = ({
    app,
    exitCode = 0,
  }: {
    app: App<Context>;
    exitCode?: number;
  }) => {
    const context = app.getContext();

    app
      .stop({
        printHandlesOnTimeout: context?.config.isDebug,
      })
      .then(
        () => {
          process.exit(exitCode);
        },
        (error) => {
          mainLogger.error('stop', undefined, {error});
          process.exit(1);
        },
      );
  };

  (async () => {
    const app = await createApp({logger: mainLogger});

    appGlobal = app;

    const context = await app.init();

    mainLogger.info('started');

    process.send?.('ready');

    await afterReady?.({app, logger: mainLogger, context});
  })().catch((error) => {
    mainLogger.error('start', undefined, {error});

    if (appGlobal) {
      shutdown({app: appGlobal, exitCode: 1});
    }
  });

  process.on('SIGINT', () => {
    if (appGlobal) {
      shutdown({app: appGlobal});
    } else {
      process.exit(0);
    }
  });
};
