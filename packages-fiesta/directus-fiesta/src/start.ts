import {prepareDirectus, runDirectus} from './run';
import {Defer} from '@-/util/src/async/defer';
import {createLinesStream} from '@-/util/src/stream/lines-stream';
import {createDirectus} from './types';
import {setupFolders} from './setup/folders';
import {setupPermissions} from './setup/permissions';

export const startDirectus = async ({publicPath}: {publicPath: string}) => {
  const {fiestaDataPath, env, directusEnv} = await prepareDirectus();

  const adminEmail = env.FIESTA_DIRECTUS_ADMIN_EMAIL || 'admin@example.org';
  const adminPassword = env.FIESTA_DIRECTUS_ADMIN_PASSWORD || '123';

  await (
    await runDirectus({
      args: ['bootstrap'],
      fiestaDataPath,
      needMkDir: true,
      env: {
        ...env,
        ADMIN_EMAIL: adminEmail,
        ADMIN_PASSWORD: adminPassword,
      },
    })
  ).runningPromise;

  const {childProcess, runningPromise} = await runDirectus({
    args: ['start'],
    fiestaDataPath,
    publicUrl: publicPath,
    stdio: ['inherit', 'pipe', 'inherit'],
    env,
  });

  const directusPort = parseInt(directusEnv.PORT, 10);

  if (!childProcess.stdout) {
    throw new Error('Directus child process has no stdout');
  }

  childProcess.stdout.setEncoding('utf8');
  const {getGenerator} = createLinesStream({stream: childProcess.stdout});

  const defer = new Defer();
  const readingStdoutDefer = new Defer();

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

  const directus = createDirectus(`http://127.0.0.1:${directusPort}/`);

  await directus.auth.login({
    email: adminEmail,
    password: adminPassword,
  });

  const setupOptions = {directus};

  await Promise.all(
    [setupFolders, setupPermissions].map((fun) => fun(setupOptions)),
  );

  const shutdownHandler = async () => {
    childProcess.kill('SIGINT');

    await readingStdoutDefer.promise;
  };

  return {
    port: directusPort,
    runningDirectusPromise: runningPromise,
    shutdownHandler,
  };
};

if (require.main === module) {
  startDirectus({publicPath: '/'})
    .then(async ({runningDirectusPromise, shutdownHandler}) => {
      const shutdownDefer = new Defer();

      process.on('SIGINT', () => {
        (async () => {
          console.log('go shutdown');
          await shutdownHandler();
          shutdownDefer.resolve();
        })().catch(shutdownDefer.reject);
      });

      await Promise.all([shutdownDefer.promise, runningDirectusPromise]);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
