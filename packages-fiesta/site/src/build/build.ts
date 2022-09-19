import {resolve as pathResolve} from 'path';
import childProcess from 'child_process';
import {readFile, writeFile} from 'fs/promises';
import {array, object, optional, record, string, infer as Infer} from 'zod';
import {EntryManifest} from '@-/fiesta-types/src/server/manifest';

const PackageJson = object({
  version: string(),
});
type PackageJson = Infer<typeof PackageJson>;

const ViteManifest = record(
  object({
    file: string(),
    css: optional(array(string())),
  }),
);
type ViteManifest = Infer<typeof ViteManifest>;

const resolve = (...path: string[]) => pathResolve(__dirname, '../..', ...path);

const main = async () => {
  const buildClientChild = spawn('vite', [
    'build',
    '-c',
    resolve('vite-client.config.ts'),
  ]);
  const buildServerChild = spawn('vite', [
    'build',
    '-c',
    resolve('vite-server.config.ts'),
  ]);

  let version: string;

  await Promise.all([
    readPackageJson().then((packageJson) => {
      version = packageJson.version;
    }),
    buildClientChild,
    buildServerChild,
  ]);

  const manifestPromise = readManifest();

  await Promise.all([
    Promise.all(
      [
        {entrySrc: 'src/entries/main-client.tsx', entryName: 'root'},
        {entrySrc: 'src/entries/admin-client.tsx', entryName: 'admin'},
      ].map(({entrySrc, entryName}) =>
        processClientEntries({
          entrySrc,
          entryName,
          version: version!,
          manifestPromise,
        }),
      ),
    ).then((manifests) => {
      const result: Record<string, EntryManifest> = {};

      manifests.forEach((manifest) => {
        result[manifest.name] = manifest;
      });

      return writeFile(
        resolve('dist/server/manifest.json'),
        JSON.stringify(result, null, '\t'),
        {encoding: 'utf8'},
      );
    }),
    spawn('cp', [resolve('misc/server.d.ts'), resolve('dist/server')]),
  ]);
};

const readPackageJson = async (): Promise<PackageJson> => {
  const content = await readJsonFile(resolve('version.json'));
  return PackageJson.parse(content);
};

const readManifest = async (): Promise<ViteManifest> => {
  const content = await readJsonFile(resolve('dist/client/manifest.json'));
  return ViteManifest.parse(content);
};

const processClientEntries = async ({
  entrySrc,
  entryName,
  version,
  manifestPromise,
}: {
  entrySrc: string;
  entryName: string;
  version: string;
  manifestPromise: Promise<ViteManifest>;
}): Promise<EntryManifest> => {
  const manifest = await manifestPromise;

  const jsPath: string = manifest[entrySrc].file;
  const cssPaths: string[] = manifest[entrySrc].css || [];

  if (cssPaths.length > 1) {
    throw new Error('css.length > 1');
  }

  const serverManifest: EntryManifest = {
    name: entryName,
    version,
    basePath: process.env.BASE_PATH || '/',
    js: [],
    css: [],
  };

  const tasks: Promise<void>[] = [];

  tasks.push(
    renameClientEntry({name: entryName, path: jsPath, version}).then((name) => {
      serverManifest.js.push(name);
    }),
  );

  cssPaths.forEach((path) => {
    tasks.push(
      renameClientEntry({name: entryName, path, version}).then((name) => {
        serverManifest.css.push(name);
      }),
    );
  });

  await Promise.all(tasks);

  return serverManifest;
};

const renameClientEntry = async ({
  name,
  path,
  version,
}: {
  name: string;
  path: string;
  version: string;
}): Promise<string> => {
  const match = /^[^/]+\.([^.]+)$/.exec(path);
  if (!match) {
    throw new Error(`invalid path: ${path}`);
  }

  const [, ext] = match;

  const newName = `${name}-${version}.${ext}`;

  await spawn('mv', [
    resolve('dist/client', path),
    resolve('dist/client', newName),
  ]);

  return newName;
};

const readJsonFile = async (path: string): Promise<unknown> => {
  const content = await readFile(path, {
    encoding: 'utf8',
  });
  return JSON.parse(content);
};

const spawn = (cmd: string, args: string[]): Promise<void> => {
  const child = childProcess.spawn(cmd, args, {
    stdio: 'inherit',
  });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (exitCode) => {
      if (exitCode) {
        reject({exitCode});
        return;
      }

      resolve();
    });
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
