import {createContext, useContext} from 'react';
import {RootDispatchFn} from '../state/root/dispatch';
import {RootMst} from '../state/root/mst';

export const RootMstContext = createContext<RootMst | undefined>(undefined);
export const useRootMst = () => {
  const store = useContext(RootMstContext);
  if (!store) {
    throw new Error('No RootMstContext');
  }

  return store;
};

export const RootDispatchContext = createContext<RootDispatchFn | undefined>(
  undefined,
);
export const useRootDispatch = () => {
  const dispatch = useContext(RootDispatchContext);
  if (!dispatch) {
    throw new Error('No RootDispatchContext');
  }

  return dispatch;
};
