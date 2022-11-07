import '@-/util/src/app/read-dotenv-side-effect';
import {runApp} from '@-/util/src/app/run';
import {createApp} from '@-/util/src/app/app';
import {getConfig} from './config/config';
import {createInitialContext} from './context/context';
import {Database} from './database/database';
import {readdir} from 'fs/promises';
import {join} from 'path';
import {transformLogsLinesToParsedLines} from './transforms/parsed-lines';
import {
  aggregateKicksPerDay,
  aggregateKicksPerHour,
  transformParsedLinesToKicks,
} from './transforms/kicks';
import {processLogFile} from './logs/process-file';

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
  afterReady: async ({app, logger, context}) => {
    const {
      database,
      config: {logsDirPath, logsFilesPattern},
    } = context;

    const patternRegexp = new RegExp(
      '^' +
        logsFilesPattern.replace(/[*.]/g, (full) => {
          switch (full) {
            case '*':
              return '.*';
            case '.':
              return '\\.';
            default:
              throw new Error('unsupported replace');
          }
        }) +
        '$',
    );

    const names = await readdir(logsDirPath);
    const logNames = names.filter((name) => patternRegexp.test(name));

    // Add all available logs to the database
    await Promise.all(
      logNames.map((logName) => {
        return processLogFile({
          path: join(logsDirPath, logName),
          database,
        }).catch((error) => {
          logger.error('logProcessing', {fileName: logName}, {error});
        });
      }),
    );

    await database.onLinesSaved();

    // Run transforms
    await Promise.all([transformLogsLinesToParsedLines({context})]);
    await Promise.all(
      [transformParsedLinesToKicks].map((fun) => fun({context})),
    );
    await Promise.all([aggregateKicksPerHour].map((fun) => fun({context})));
    await Promise.all([aggregateKicksPerDay].map((fun) => fun({context})));

    await app.stop();
  },
});
