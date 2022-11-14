import {createContext, useContext} from 'react';
import {MainDispatchFn} from '../state/main/dispatch';
import {MainMst} from '../state/main/mst';

export const MainMstContext = createContext<MainMst | undefined>(undefined);
export const useMainMst = () => {
  const store = useContext(MainMstContext);
  if (!store) {
    throw new Error('No MainMstContext');
  }

  return store;
};

export const MainDispatchContext = createContext<MainDispatchFn | undefined>(
  undefined,
);
export const useRootDispatch = () => {
  const dispatch = useContext(MainDispatchContext);
  if (!dispatch) {
    throw new Error('No RootDispatchContext');
  }

  return dispatch;
};
