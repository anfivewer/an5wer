import {runApp} from '@-/util/src/app/run';
import {createApp} from '@-/util/src/app/app';
import {getConfig} from './config/config';
import {createInitialContext} from './context/context';
import {writeFileSync} from 'fs';

runApp({
  createApp: ({logger}) =>
    createApp({
      getLogger: () => logger,
      getConfig,
      setupLoggerByConfig: ({logger, config}) => {
        logger.setDebug(config.isDebug);
      },
      getInitialContext: createInitialContext,
      preInit: async ({config}) => {
        logger.info('preInit', undefined, {extra: config});
        await Promise.resolve();
      },
    }),
});

writeFileSync('/home/shieldy/test.txt', 'passed');
