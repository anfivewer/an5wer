import {createViteConfig} from '@-/frontend/lib/vite/create-vite-config';

export const {clientConfig, ssrConfig} = createViteConfig({
  packagePath: __dirname,
  assetsBaseUrl: process.env.ASSETS_BASE_URL,
  entries: ['main'],
});
