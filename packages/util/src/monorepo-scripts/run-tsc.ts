import {readdir, readFile} from 'fs/promises';
import {join, relative, resolve} from 'path';
import {parse as parseYaml} from 'yaml';
import {ArrayOfStrings} from '@-/types/src/zod/primitives';
import {spawn} from 'child_process';
import {Defer} from '../async/defer';

const repoRoot = resolve(__dirname, '../../../..');

(async () => {
  const content = await readFile(join(repoRoot, 'pnpm-workspace.yaml'), {
    encoding: 'utf8',
  });
  const {packages: packagesRaw} = parseYaml(content);

  const pnpmPackageRoots = ArrayOfStrings.parse(packagesRaw);

  const packageRootPaths = pnpmPackageRoots.map((pattern) => {
    const match = /^\.\/(.+)\/\*$/.exec(pattern);
    if (!match) {
      throw new Error(`Unsupported package pattern ${pattern}`);
    }

    return match[1];
  });

  const packagePaths = (
    await Promise.all(
      packageRootPaths.map(async (path) => {
        return (await readdir(join(repoRoot, path))).map((name) =>
          join(repoRoot, path, name),
        );
      }),
    )
  ).flat();

  const result = await Promise.all(
    packagePaths.map(async (packagePath) => {
      const cp = await spawn('npm', ['run', 'tsc', '--', '--pretty'], {
        stdio: 'pipe',
        cwd: packagePath,
      });

      cp.stdout.setEncoding('utf8');
      cp.stderr.setEncoding('utf8');

      let stdout = '';
      let stderr = '';

      const resultDefer = new Defer<{
        path: string;
        code: number | null;
        stdout: string;
        stderr: string;
        error?: unknown;
      }>();

      cp.stdout.on('data', (data) => {
        stdout += data;
      });

      cp.stderr.on('data', (data) => {
        stderr += data;
      });

      cp.on('close', (code) => {
        resultDefer.resolve({path: packagePath, code, stdout, stderr});
      });

      cp.on('error', (error) => {
        resultDefer.resolve({
          path: packagePath,
          code: null,
          stdout,
          stderr,
          error,
        });
      });

      return resultDefer.promise;
    }),
  );

  let exitCode = 0;

  result.forEach(({path, code, stdout, stderr, error}) => {
    if (code === 0 && !stderr && !error) {
      return;
    }

    const relativePath = relative(repoRoot, path);

    process.stderr.write(
      `Error when checking ${relativePath}, exit code ${code}\n`,
    );
    process.stderr.write(stdout);
    process.stderr.write(stderr);
    process.stderr.write('\n');

    exitCode = 1;
  });

  process.exit(exitCode);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
