import '@-/util/src/app/read-dotenv-side-effect';
import {runApp} from '@-/util/src/app/run';
import {createApp} from '@-/util/src/app/app';
import {getConfig} from './config/config';
import {createInitialContext} from './context/context';
import {Database} from './database/database';

runApp({
  createApp: ({logger}) =>
    createApp({
      getLogger: () => logger,
      getConfig,
      setupLoggerByConfig: ({logger, config}) => {
        logger.setDebug(config.isDebug);
      },
      getInitialContext: createInitialContext,
      preInit: async ({app}) => {
        app.registerComponent({
          name: 'database',
          getComponent: ({logger}) => new Database({logger}),
        });
        await Promise.resolve();
      },
    }),
  afterReady: async ({app}) => {
    await app.stop();
  },
});
