import {createGetConfig} from '@-/util/src/app/config';
import {Config} from './types';

export const getConfig = createGetConfig<Config>(({getBoolean, getInteger}) => {
  return Promise.resolve({
    isDev: getBoolean('IS_DEV', false),
    isDebug: getBoolean('IS_DEBUG', false),
    serverPort: getInteger('DIFFBELT_PORT'),
  });
});
