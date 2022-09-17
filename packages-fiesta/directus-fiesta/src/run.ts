import {spawn} from 'child_process';
import path from 'path';
import {mkdir} from 'fs/promises';
import {Defer} from '@-/util/src/async/defer';

export const runDirectus = async ({
  args,
  needMkDir = false,
  publicUrl = '/',
  fiestaDataPath,
  env,
}: {
  args: string[];
  needMkDir?: boolean;
  publicUrl?: string;
  fiestaDataPath: string;
  env: Record<string, string | undefined>;
}) => {
  const directusDataPath = path.join(fiestaDataPath, 'directus');

  if (needMkDir) {
    await mkdir(path.join(directusDataPath, 'uploads'), {recursive: true});
  }

  const directusProcess = spawn('./node_modules/.bin/directus', args, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
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

  return defer.promise;
};
