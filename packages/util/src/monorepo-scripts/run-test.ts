import {runNpmScriptForAllPackagesSideEffect} from './helpers/run-npm-script';

runNpmScriptForAllPackagesSideEffect({
  name: 'test',
  args: ['--color'],
  onlyIfPresent: true,
  allowStderr: true,
});
