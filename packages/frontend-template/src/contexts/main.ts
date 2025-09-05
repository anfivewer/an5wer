import {createContext, useContext} from 'react';
import {MainDispatchFn} from '../state/main/dispatch';
import {MainStore} from '../state/main/store';

export const MainStoreContext = createContext<MainStore | undefined>(undefined);
export const useMainStore = () => {
  const store = useContext(MainStoreContext);
  if (!store) {
    throw new Error('No MainStoreContext');
  }

  return store;
};

export const MainDispatchContext = createContext<MainDispatchFn | undefined>(
  undefined,
);
export const useMainDispatch = () => {
  const dispatch = useContext(MainDispatchContext);
  if (!dispatch) {
    throw new Error('No MainDispatchContext');
  }

  return dispatch;
};
