import {resolve} from 'path';
import childProcess from 'child_process';
import {readFile, writeFile} from 'fs/promises';
import {
  array,
  object,
  optional,
  record,
  string,
  infer as Infer,
  ZodEnum,
} from 'zod';
import {EntryManifest} from '@-/types/src/frontend/entry-manifest';
import {CommonSiteManifest} from '@-/types/src/frontend/site-manifest';
import {zodEnum} from '@-/types/src/zod/zod';

const DefaultSsrEntriesEnum = zodEnum(['main']);

export const runBuild = <
  ClientEntries extends [string, ...string[]],
  SsrEntries extends [string, ...string[]] = ['main'],
>({
  packagePath,
  clientEntriesZodEnum,
  ssrEntriesZodEnum: ssrEntriesZodEnumRaw,
}: {
  packagePath: string;
  clientEntriesZodEnum: ZodEnum<ClientEntries>;
  ssrEntriesZodEnum?: ZodEnum<SsrEntries>;
}) => {
  const ssrEntriesZodEnum = ssrEntriesZodEnumRaw || DefaultSsrEntriesEnum;

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

  const vitePath = resolve(__dirname, '../../node_modules/.bin/vite');

  const main = async () => {
    const buildClientChild = spawn(vitePath, [
      'build',
      '-c',
      resolve(packagePath, 'vite-client.config.ts'),
    ]);
    const buildServerChild = spawn(vitePath, [
      'build',
      '-c',
      resolve(packagePath, 'vite-ssr.config.ts'),
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
        clientEntriesZodEnum.options
          .map((name) => ({
            entrySrc: `src/entries/${name}-client.tsx`,
            entryName: name,
          }))
          .map(({entrySrc, entryName}) =>
            processClientEntries({
              entrySrc,
              entryName,
              version: version!,
              manifestPromise,
            }),
          ),
      ).then((manifests) => {
        const entries: CommonSiteManifest['entries'] = {};
        const result: CommonSiteManifest = {
          version: 1,
          entries,
          ssrEntries: ssrEntriesZodEnum.options,
        };

        manifests.forEach((manifest) => {
          entries[manifest.name] = manifest;
        });

        return writeFile(
          resolve(packagePath, 'dist/server/manifest.json'),
          JSON.stringify(result, null, '\t'),
          {encoding: 'utf8'},
        );
      }),
      ...ssrEntriesZodEnum.options.map((name) =>
        spawn('cp', [
          resolve(packagePath, `misc/${name}.d.ts`),
          resolve(packagePath, 'dist/server'),
        ]),
      ),
    ]);
  };

  const readPackageJson = async (): Promise<PackageJson> => {
    const content = await readJsonFile(resolve(packagePath, 'version.json'));
    return PackageJson.parse(content);
  };

  const readManifest = async (): Promise<ViteManifest> => {
    const content = await readJsonFile(
      resolve(packagePath, 'dist/client/manifest.json'),
    );
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
      renameClientEntry({name: entryName, path: jsPath, version}).then(
        (name) => {
          serverManifest.js.push(name);
        },
      ),
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
      resolve(packagePath, 'dist/client', path),
      resolve(packagePath, 'dist/client', newName),
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
};
