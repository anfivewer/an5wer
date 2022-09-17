import {DotenvParseOutput, parse} from 'dotenv';
import {readFile, writeFile} from 'fs/promises';
import {resolve} from 'path';
import {randomBytes} from 'crypto';

import {runDirectus} from './run';
import {Defer} from '@-/util/src/async/defer';

const readDotEnv = async (dotEnvPath: string) => {
  const dotEnvContent = await readFile(dotEnvPath, {
    encoding: 'utf8',
  });

  return parse(dotEnvContent);
};

const genKey = () => {
  const defer = new Defer<string>();

  randomBytes(16, (error, buffer) => {
    if (error) {
      defer.reject(error);
      return;
    }

    defer.resolve(buffer.toString('hex'));
  });

  return defer.promise;
};

const readAndFixProjectEnv = async (): Promise<DotenvParseOutput> => {
  const dotEnvPath = resolve(__dirname, '../../../.env');

  const dotEnvContent = await readFile(dotEnvPath, {
    encoding: 'utf8',
  });

  const env = parse(dotEnvContent);

  const linesToAppend: string[] = [];

  const [key, secret] = await Promise.all(
    ['FIESTA_DIRECTUS_KEY', 'FIESTA_DIRECTUS_SECRET'].map(async (name) => {
      const key = env[name];

      if (key) {
        return key;
      }

      const generatedKey = await genKey();

      linesToAppend.push(`${name} = ${generatedKey}`);

      return generatedKey;
    }),
  );

  if (linesToAppend.length) {
    const newContent = `${dotEnvContent.replace(
      /\n+$/,
      '',
    )}\n\n${linesToAppend.join('\n')}\n`;

    await writeFile(dotEnvPath, newContent, {encoding: 'utf8'});
  }

  return {
    ...env,
    FIESTA_DIRECTUS_KEY: key,
    FIESTA_DIRECTUS_SECRET: secret,
  };
};

export const startDirectus = async () => {
  const [env, directusEnv] = await Promise.all([
    readAndFixProjectEnv(),
    readDotEnv(resolve(__dirname, '../.env')),
  ]);

  const fiestaDataPath = env.FIESTA_DATA_PATH;
  if (!fiestaDataPath) {
    throw new Error('No FIESTA_DATA_PATH');
  }

  const commonEnv = {
    KEY: env.FIESTA_DIRECTUS_KEY,
    SECRET: env.FIESTA_DIRECTUS_SECRET,
  };

  await runDirectus({
    args: ['bootstrap'],
    fiestaDataPath,
    needMkDir: true,
    env: {
      ...env,
      ...commonEnv,
      ADMIN_EMAIL: env.FIESTA_DIRECTUS_ADMIN_EMAIL || 'admin@example.org',
      ADMIN_PASSWORD: env.FIESTA_DIRECTUS_ADMIN_PASSWORD || '123',
    },
  });

  const runningDirectusPromise = runDirectus({
    args: ['start'],
    fiestaDataPath,
    env: {
      ...env,
      ...commonEnv,
    },
  });

  return {
    port: parseInt(directusEnv.PORT, 10),
    runningDirectusPromise,
  };
};

if (require.main === module) {
  startDirectus()
    .then(({runningDirectusPromise}) => {
      return runningDirectusPromise;
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
