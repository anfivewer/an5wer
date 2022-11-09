import {GetStateFn} from '../types';
import {MainPageState} from '@-/sesuritu-types/src/site/state/main';

export const getMainPageState: GetStateFn<MainPageState> = async () => {
  return await Promise.resolve({
    answer: 42,
  });
};
