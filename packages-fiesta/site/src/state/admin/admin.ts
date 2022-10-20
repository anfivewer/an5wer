import {AdminPageState} from '@-/fiesta-types/src/site/state/admin';
import {GetStateFn} from '../types';

export const getAdminPageState: GetStateFn<AdminPageState> = ({
  config: {directusPath},
}) => {
  return Promise.resolve({
    directusUrl: directusPath,
  });
};
