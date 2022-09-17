import path from 'path';
import {config} from 'dotenv';
import {Config} from './types/config';
import {Logger} from '@-/util/src/logging/types';

config({path: path.resolve(__dirname, '../../../.env')});

export const getConfig = ({logger}: {logger: Logger}): Config => {
  let error: Error | undefined;

  const getNonEmptyString = (name: string): string => {
    const value = process.env[name];
    if (!value) {
      error = new Error(`process.env.${name} should be present`);
      logger.error('noValue', {name}, {error});
      return '';
    }

    return value;
  };

  const dataPath = getNonEmptyString('FIESTA_DATA_PATH');

  const config: Config = {
    // uses local site renderer
    isDev: process.env.IS_DEV === '1',
    // sets logger to not escape \n in stack traces
    isDebug: process.env.IS_DEBUG === '1',
    dataPath,
    buildsPath: path.join(dataPath, 'builds'),
    siteVersionPath: path.join(dataPath, 'site-version.json'),
    directusPublicPath: '/_directus/',
  };

  if (error) {
    throw error;
  }

  return config;
};
