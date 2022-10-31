import '@-/util/src/app/read-dotenv-side-effect';
import {runApp} from '@-/util/src/app/run';
import {createApp} from '@-/util/src/app/app';
import {getConfig} from './config/config';
import {createInitialContext} from './context/context';
import {Database} from './database/database';
import {readdir} from 'fs/promises';
import {createReadStream} from 'fs';
import {join} from 'path';
import {LinesNormalizer} from './logs/lines-normalizer';
import {createReadableLinesStream} from '@-/util/src/stream/lines-stream';

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
      logsFilesPattern.replace(/[*.]/g, (full) => {
        switch (full) {
          case '*':
            return '.*';
          case '.':
            return '\\.';
          default:
            throw new Error('unsupported replace');
        }
      }),
    );

    const names = await readdir(logsDirPath);
    const logNames = names.filter((name) => patternRegexp.test(name));

    // Add all available logs to the database
    await Promise.all(
      logNames.map((logName) => {
        return (async () => {
          const linesNormalizer = new LinesNormalizer();
          const rs = createReadStream(join(logsDirPath, logName), {
            encoding: 'utf8',
          });

          const linesStream = createReadableLinesStream({stream: rs});

          for await (const line of linesStream) {
            const normalizedLine = linesNormalizer.normalizeLine(line);

            if (!normalizedLine) {
              continue;
            }

            database.addLine(normalizedLine);
          }
        })().catch((error) => {
          logger.error('logProcessing', {fileName: logName}, {error});
        });
      }),
    );

    // Run transforms

    await app.stop();
  },
});
