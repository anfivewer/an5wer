import {runNpmScriptForAllPackagesSideEffect} from './helpers/run-npm-script';

runNpmScriptForAllPackagesSideEffect({
  name: 'tsc',
  args: ['--pretty'],
});
