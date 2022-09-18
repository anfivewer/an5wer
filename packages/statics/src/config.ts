import path from 'path';
import {config} from 'dotenv';
import {Config} from './types/config';
import {Logger} from '@-/util/src/logging/types';

config({path: path.resolve(__dirname, '../../../.env')});

type GetParamFn = {
  (name: string): string;
  <T>(name: string, mapper: (value: string) => T): T;
};

export const getConfig = ({logger}: {logger: Logger}): Config => {
  let error: unknown;

  const getParameter: GetParamFn = ((name, mapper) => {
    const value = process.env[name];
    if (!value) {
      error = new Error(`process.env.${name} should be present`);
      logger.error('noValue', {name}, {error});
      return;
    }

    if (mapper) {
      try {
        return mapper(value);
      } catch (e) {
        error = e;
        logger.error('mapper', {name}, {error: e});
        return;
      }
    }

    return value;
  }) as GetParamFn;

  const dataPath = getParameter('FIESTA_STATICS_PATH');

  const config: Config = {
    isDev: process.env.IS_DEV === '1',
    isDebug: process.env.IS_DEBUG === '1',
    dataPath,
    sessionsPath: path.join(dataPath, 'sessions.json'),
    httpPort: getParameter('FIESTA_STATICS_PORT', (str) => {
      const port = parseInt(str, 10);
      if (!isFinite(port) || port <= 0 || port >= 2 ** 16) {
        throw new Error(`invalid port: ${str}`);
      }

      return port;
    }),
    privateStaticsUrlPrefix: getParameter('FIESTA_STATICS_PRIVATE'),
  };

  if (error) {
    throw error;
  }

  return config;
};
