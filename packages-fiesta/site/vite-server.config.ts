import {defineConfig} from 'vite';
import {resolve} from 'path';
import {viteBaseConfig} from './vite-base.config';

export default defineConfig({
  ...viteBaseConfig,
  build: {
    ...viteBaseConfig.build,
    ssr: true,
    outDir: resolve(__dirname, 'dist/server'),
    rollupOptions: {
      input: {
        server: resolve(__dirname, 'src/entries/server.tsx'),
      },
    },
  },
});
