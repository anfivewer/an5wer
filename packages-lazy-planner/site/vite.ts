import {createViteConfig} from '@-/frontend/src/vite/create-vite-config';
import {resolve} from 'node:path';

const srcFolder = (path: string) => `${resolve(__dirname, 'src', path)}/`;

export const {clientConfig, ssrConfig} = createViteConfig({
  packagePath: __dirname,
  assetsBaseUrl: process.env.ASSETS_BASE_URL,
  entries: ['main'],
  fullReloadOnFoldersChange: [srcFolder('state')],
  resolveAlias: {
    '@': srcFolder('.'),
  },
});
