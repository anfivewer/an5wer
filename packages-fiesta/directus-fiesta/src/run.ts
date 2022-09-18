import {spawn, StdioOptions} from 'child_process';
import path, {resolve} from 'path';
import {mkdir, readFile, writeFile} from 'fs/promises';
import {Defer} from '@-/util/src/async/defer';
import {DotenvParseOutput, parse} from 'dotenv';
import {randomBytes} from 'crypto';

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

export const prepareDirectus = async () => {
  const [env, directusEnv] = await Promise.all([
    readAndFixProjectEnv(),
    readDotEnv(resolve(__dirname, '../.env')),
  ]);

  const fiestaDataPath = env.FIESTA_DATA_PATH;
  if (!fiestaDataPath) {
    throw new Error('No FIESTA_DATA_PATH');
  }

  return {
    env: {
      ...env,
      KEY: env.FIESTA_DIRECTUS_KEY,
      SECRET: env.FIESTA_DIRECTUS_SECRET,
    } as typeof env,
    directusEnv,
    fiestaDataPath,
  };
};

export const runDirectus = async ({
  args,
  needMkDir = false,
  publicUrl = '/',
  fiestaDataPath,
  env,
  stdio = 'inherit',
  resolveOnExit = false,
}: {
  args: string[];
  needMkDir?: boolean;
  publicUrl?: string;
  fiestaDataPath: string;
  env: Record<string, string | undefined>;
  stdio?: StdioOptions;
  resolveOnExit?: boolean;
}) => {
  const directusDataPath = path.join(fiestaDataPath, 'directus');

  if (needMkDir) {
    await mkdir(path.join(directusDataPath, 'uploads'), {recursive: true});
  }

  const directusProcess = spawn('./node_modules/.bin/directus', args, {
    cwd: path.resolve(__dirname, '..'),
    stdio,
    detached: false,
    env: {
      ...process.env,
      ...env,
      PUBLIC_URL: publicUrl,
      DB_FILENAME: path.join(directusDataPath, 'data.db'),
      STORAGE_LOCAL_ROOT: path.join(directusDataPath, 'uploads'),
    },
  });

  const defer = new Defer();

  directusProcess.on('exit', (code) => {
    if (code) {
      defer.reject(new Error(`Directus exit code: ${code}`));
      return;
    }

    defer.resolve();
  });

  if (resolveOnExit) {
    await defer.promise;
  }

  return {
    childProcess: directusProcess,
    runningPromise: defer.promise,
  };
};

if (require.main === module) {
  (async () => {
    const {fiestaDataPath, env} = await prepareDirectus();

    await runDirectus({
      args: process.argv.slice(2),
      fiestaDataPath,
      needMkDir: true,
      env,
    });
  })().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
