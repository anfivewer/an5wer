import path from 'path';
import {config} from 'dotenv';
import {Config} from '@-/fiesta-types/src/server/config';
import {createGetConfig} from '@-/util/src/app/config';

config({path: path.resolve(__dirname, '../../../.env')});

export const getConfig = createGetConfig(
  ({getNonEmptyString, getInteger, getBoolean}) => {
    const dataPath = getNonEmptyString('FIESTA_DATA_PATH');

    const config: Config = {
      // uses local site renderer
      isDev: getBoolean('IS_DEV', false),
      // sets logger to not escape \n in stack traces
      isDebug: getBoolean('IS_DEBUG', false),
      dataPath,
      adminPath: getNonEmptyString('FIESTA_ADMIN_PATH', '/admin'),
      directusPath: getNonEmptyString('FIESTA_DIRECTUS_PATH', '/_directus'),
      serverPort: getInteger('FIESTA_PORT'),
      directusPort: getInteger('FIESTA_DIRECTUS_PORT'),
      buildsPath: path.join(dataPath, 'builds'),
      directusAdminEmail: getNonEmptyString('FIESTA_DIRECTUS_ADMIN_EMAIL'),
      directusAdminPassword: getNonEmptyString(
        'FIESTA_DIRECTUS_ADMIN_PASSWORD',
      ),
    };

    return Promise.resolve(config);
  },
);
