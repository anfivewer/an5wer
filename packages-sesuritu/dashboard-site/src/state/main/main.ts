import {GetStateFn} from '../types';
import {MainPageState} from '@-/sesuritu-types/src/site/state/main';

export const getMainPageState: GetStateFn<MainPageState> = async ({
  getReport,
}) => {
  return await Promise.resolve({
    answer: 42,
    report: getReport?.(),
  });
};
