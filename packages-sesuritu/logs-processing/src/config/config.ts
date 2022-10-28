import {createGetConfig} from '@-/util/src/app/config';
import {Config} from './types';

export const getConfig = createGetConfig<Config>(
  ({getBoolean, getNonEmptyString}) => {
    return Promise.resolve({
      isDev: getBoolean('IS_DEV', false),
      isDebug: getBoolean('IS_DEBUG', false),
      databaseDumpPath: getNonEmptyString('SESURITU_LOGS_DB_DUMP_PATH'),
      logsDirPath: getNonEmptyString('SESURITU_LOGS_LOGS_DIR_PATH'),
      logsFilesPattern: getNonEmptyString('SESURITU_LOGS_LOGS_FILES_PATTERN'),
    });
  },
);
