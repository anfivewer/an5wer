import {prepareDirectus, runDirectus} from './run';
import {Defer} from '@-/util/src/async/defer';
import {createReadableLinesStream} from '@-/util/src/stream/lines-stream';
import {createDirectus} from './types';
import {setupFolders} from './setup/folders';
import {setupPermissions} from './setup/permissions';
import {resolve} from 'path';
import {setupMockData} from './setup/mock-data';
import {setupKv} from './setup/kv';

export type DirectusStartOptions = {
  publicPath: string;
  port: number;
};

export const startDirectus = async ({
  publicPath,
  port,
}: DirectusStartOptions) => {
  const {fiestaDataPath, env} = await prepareDirectus();

  const adminEmail = env.FIESTA_DIRECTUS_ADMIN_EMAIL || 'admin@example.org';
  const adminPassword = env.FIESTA_DIRECTUS_ADMIN_PASSWORD || '123';

  // TODO: check if this steps are needed to execute
  await runDirectus({
    args: ['bootstrap'],
    fiestaDataPath,
    needMkDir: true,
    resolveOnExit: true,
    env: {
      ...env,
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
    },
  });

  await runDirectus({
    args: [
      'schema',
      'apply',
      '--yes',
      resolve(__dirname, '../data-model/snapshot.yaml'),
    ],
    fiestaDataPath,
    resolveOnExit: true,
    env,
  });

  const {childProcess, runningPromise} = await runDirectus({
    args: ['start'],
    fiestaDataPath,
    publicUrl: publicPath,
    stdio: ['inherit', 'pipe', 'inherit'],
    env: {
      ...env,
      PORT: String(port),
    },
  });

  if (!childProcess.stdout) {
    throw new Error('Directus child process has no stdout');
  }

  childProcess.stdout.setEncoding('utf8');
  const {getGenerator} = createReadableLinesStream({
    stream: childProcess.stdout,
  });

  const defer = new Defer();
  const readingStdoutDefer = new Defer();

  runningPromise.catch((error) => {
    defer.reject(error);
    readingStdoutDefer.reject(error);
  });

  (async () => {
    const linesGenerator = getGenerator();

    for await (const line of linesGenerator) {
      process.stdout.write(line);
      process.stdout.write('\n');

      if (line.includes('Server started')) {
        defer.resolve();
        break;
      }
    }

    for await (const line of linesGenerator) {
      process.stdout.write(line);
      process.stdout.write('\n');
    }

    readingStdoutDefer.resolve();
  })().catch((error) => {
    defer.reject(error);
  });

  await defer.promise;

  const directus = createDirectus(`http://127.0.0.1:${port}/`);

  await directus.auth.login({
    email: adminEmail,
    password: adminPassword,
  });

  const setupOptions = {directus};

  await Promise.all(
    [setupFolders, setupPermissions, setupMockData, setupKv].map((fun) =>
      fun(setupOptions),
    ),
  );

  const shutdown = async () => {
    childProcess.kill('SIGINT');

    await readingStdoutDefer.promise;
  };

  return {
    port,
    runningDirectusPromise: runningPromise,
    shutdown,
  };
};

if (require.main === module) {
  let shutdownHandler = () => Promise.resolve();
  let runningPromise: Promise<void> = Promise.resolve();

  startDirectus({publicPath: '/', port: 3002})
    .then(async ({runningDirectusPromise, shutdown}) => {
      shutdownHandler = shutdown;
      runningPromise = runningDirectusPromise;
      const shutdownDefer = new Defer();

      process.on('SIGINT', () => {
        (async () => {
          await shutdownHandler();
          shutdownDefer.resolve();
        })().catch(shutdownDefer.reject);
      });

      await Promise.all([shutdownDefer.promise, runningDirectusPromise]);
    })
    .catch(async (error) => {
      console.error(error);

      await shutdownHandler();
      await runningPromise.catch(() => {
        //
      });

      process.exit(1);
    });
}
