import {UserConfig, defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import sassDts from 'vite-plugin-sass-dts';
import {resolve} from 'path';

export const createViteConfig = ({
  packagePath,
  assetsBaseUrl,
  entries,
  ssrEntries = ['main'],
}: {
  packagePath: string;
  assetsBaseUrl: string | undefined;
  entries: string[];
  ssrEntries?: string[];
}) => {
  const viteBaseConfig: UserConfig = {
    root: packagePath,
    base: assetsBaseUrl,
    plugins: [react(), sassDts()],
    clearScreen: false,
    build: {
      assetsDir: '.',
    },
  };

  const clientViteEntries: Record<string, string> = {};
  const ssrViteEntries: Record<string, string> = {};

  entries.forEach((name) => {
    clientViteEntries[name] = resolve(
      packagePath,
      `src/entries/${name}-client.tsx`,
    );
  });

  ssrEntries.forEach((name) => {
    ssrViteEntries[name] = resolve(packagePath, `src/entries/${name}-ssr.tsx`);
  });

  const clientConfig = defineConfig({
    ...viteBaseConfig,
    build: {
      ...viteBaseConfig.build,
      manifest: true,
      outDir: resolve(packagePath, 'dist/client'),
      rollupOptions: {
        input: clientViteEntries,
      },
    },
  });

  const ssrConfig = defineConfig({
    ...viteBaseConfig,
    build: {
      ...viteBaseConfig.build,
      ssr: true,
      outDir: resolve(packagePath, 'dist/server'),
      rollupOptions: {
        input: ssrViteEntries,
      },
    },
  });

  return {clientConfig, ssrConfig};
};
