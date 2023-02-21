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
import {renderReport} from './report/render-report';
import {aggregateParsedLinesPerDay} from './transforms/parsed-lines-per-day';
import {aggregateUpdatesHandlingPerDay} from './transforms/update-handle';
import {
  calculateUniqueChats,
  calculateUniqueUsers,
} from './transforms/unique-count';

runApp({
  withTimeout: false,
  createApp: ({logger}) =>
    createApp({
      getLogger: () => logger,
      getConfig,
      setupLoggerByConfig: ({logger}) => {
        logger.setDebug(true);
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

    logger.info('logRead:finish');

    await database.onLinesSaved();

    logger.info('linesSaved');

    // Run transforms
    await Promise.all([transformLogsLinesToParsedLines({context})]);

    logger.info('parsedLines:done');

    await Promise.all(
      [
        transformParsedLinesToKicks,
        aggregateParsedLinesPerDay,
        aggregateUpdatesHandlingPerDay,
        calculateUniqueChats,
        calculateUniqueUsers,
      ].map((fun) => fun({context})),
    );

    logger.info('aggregations:1:done');

    await Promise.all([aggregateKicksPerHour].map((fun) => fun({context})));

    logger.info('aggregations:kicks:perHour:done');

    await Promise.all([aggregateKicksPerDay].map((fun) => fun({context})));

    logger.info('aggregations:kicks:perDay:done');

    await renderReport({context});

    logger.info('renderReport:done');

    context.needDumpDatabaseOnStop = true;
    await app.stop({withTimeout: false});
  },
});
