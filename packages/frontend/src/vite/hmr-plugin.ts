import {PluginOption} from 'vite';

export const createHmrPlugin = (options: {
  fullReloadOnFoldersChange: string[];
}): PluginOption => {
  const {fullReloadOnFoldersChange} = options;

  return {
    name: 'an5wer-hmr-plugin',
    configureServer(server) {
      const {ws, watcher} = server;

      watcher.on('change', (file) => {
        const isFullReload = fullReloadOnFoldersChange.some((path) =>
          file.startsWith(path),
        );

        if (isFullReload) {
          ws.send({type: 'full-reload'});
        }
      });
    },
  };
};
