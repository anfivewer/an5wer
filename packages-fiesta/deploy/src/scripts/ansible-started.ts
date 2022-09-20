import {readExecutionConfig, writeExecutionConfig} from './helpers';

(async () => {
  const config = await readExecutionConfig();

  const {nextExecution} = config;

  if (!nextExecution) {
    throw new Error('next execution should be present');
  }

  const {version} = nextExecution;

  await writeExecutionConfig({
    ...config,
    currentVersion: version,
    currentExecution: nextExecution,
    nextExecution: undefined,
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
