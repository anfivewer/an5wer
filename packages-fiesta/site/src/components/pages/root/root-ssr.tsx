import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import React, {FC, useState} from 'react';
import {RootDispatchContext, RootMstContext} from '../../../contexts/root';
import {RootMst} from '../../../state/root/mst';
import {PageName} from '../../../state/root/pages/name';
import {getDispatch} from './dispatch';
import {RootPage} from './root';

export const RootPageSsr: FC<{state: RootPageState}> = ({state}) => {
  const [{store, dispatch}] = useState(() => {
    const store = RootMst.create({
      page: {
        name: PageName.carEvents,
      },
      serverState: state,
    });

    const dispatch = getDispatch({store});

    return {store, dispatch};
  });

  return (
    <RootDispatchContext.Provider value={dispatch}>
      <RootMstContext.Provider value={store}>
        <RootPage />
      </RootMstContext.Provider>
    </RootDispatchContext.Provider>
  );
};
