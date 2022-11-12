import {MainPageState} from '@-/sesuritu-types/src/site/state/main';
import React, {FC, useState} from 'react';
import {MainDispatchContext, MainMstContext} from '../../../contexts/main';
import {MainMst} from '../../../state/main/mst';
import {getDispatch} from './dispatch';
import {MainPage} from './main';

export const MainPageEntry: FC<{state: MainPageState}> = ({state}) => {
  const [{store, dispatch}] = useState(() => {
    const store = MainMst.create({
      serverState: state,
    });

    const dispatch = getDispatch({store});

    return {store, dispatch};
  });

  return (
    <MainDispatchContext.Provider value={dispatch}>
      <MainMstContext.Provider value={store}>
        <MainPage />
      </MainMstContext.Provider>
    </MainDispatchContext.Provider>
  );
};
