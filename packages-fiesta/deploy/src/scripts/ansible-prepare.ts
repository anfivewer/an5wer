import {readExecutionConfig, writeExecutionConfig} from './helpers';
import {ExecutionConfig} from './types';

(async () => {
  const config = await readExecutionConfig({returnDefaultIfNotExists: true});

  const {currentVersion, currentExecution} = config;

  const nextId = currentExecution?.id === 1 ? 2 : 1;

  const newConfig: ExecutionConfig = {
    ...config,
    nextExecution: {
      id: nextId,
      version: currentVersion + 1,
      port: nextId === 1 ? 3001 : 3003,
      directusPort: nextId === 1 ? 3002 : 3004,
    },
  };

  const newConfigStr = JSON.stringify(newConfig);

  await writeExecutionConfig(newConfig);

  process.stdout.write(newConfigStr);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
