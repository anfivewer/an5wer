import {resolve} from 'path';
import {UserConfig} from 'vite';
import react from '@vitejs/plugin-react';
import sassDts from 'vite-plugin-sass-dts';

export const viteBaseConfig: UserConfig = {
  root: resolve(__dirname),
  // 'https://static.anfivewer.com/fiesta/'
  base: process.env.BASE_PATH,
  plugins: [react(), sassDts()],
  clearScreen: false,
  build: {
    assetsDir: '.',
  },
};
