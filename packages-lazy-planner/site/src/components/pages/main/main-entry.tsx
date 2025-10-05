import {MainPageState} from '@-/lazy-planner-types/src/site/state/main';
import React, {FC, useState} from 'react';
import {MainDispatchContext, MainStoreContext} from '../../../contexts/main';
import {getDispatch} from './dispatch';
import {MainPage} from './main';
import {MainStore} from '../../../state/main/store';
import {ThemeProvider} from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

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
        <ThemeProvider theme="light">
          <MainPage />
        </ThemeProvider>
      </MainStoreContext.Provider>
    </MainDispatchContext.Provider>
  );
};
