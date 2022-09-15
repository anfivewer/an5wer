import {defineConfig} from 'vite';
import {resolve} from 'path';
import {viteBaseConfig} from './vite-base.config';

export default defineConfig({
  ...viteBaseConfig,
  build: {
    ...viteBaseConfig.build,
    manifest: true,
    outDir: resolve(__dirname, 'dist/client'),
    rollupOptions: {
      input: {
        client: resolve(__dirname, 'src/entries/main-client.tsx'),
        admin: resolve(__dirname, 'src/entries/admin-client.tsx'),
      },
    },
  },
});
