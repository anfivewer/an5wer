import {MainPageState} from '@-/app-types-template/src/site/state/main';
import React, {FC, useState} from 'react';
import {MainDispatchContext, MainStoreContext} from '../../../contexts/main';
import {getDispatch} from './dispatch';
import {MainPage} from './main';
import {MainStore} from '../../../state/main/store';

export const MainPageEntry: FC<{state: MainPageState}> = ({state}) => {
  const [{store, dispatch}] = useState(() => {
    const store = new MainStore({
      serverState: state,
    });

    const dispatch = getDispatch({store});

    return {store, dispatch};
  });

  return (
    <MainDispatchContext.Provider value={dispatch}>
      <MainStoreContext.Provider value={store}>
        <MainPage />
      </MainStoreContext.Provider>
    </MainDispatchContext.Provider>
  );
};
