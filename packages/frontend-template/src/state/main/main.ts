import {GetStateFn} from '../types';
import {MainPageState} from '@-/app-types-template/src/site/state/main';

export const getMainPageState: GetStateFn<MainPageState> = async () => {
  return await Promise.resolve({
    answer: 42,
  });
};
