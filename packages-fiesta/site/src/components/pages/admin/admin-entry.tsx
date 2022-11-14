import {AdminPageState} from '@-/fiesta-types/src/site/state/admin';
import React, {FC, useState} from 'react';
import {AdminMstContext} from '../../../contexts/admin-mst';
import {AdminMst} from '../../../state/admin/mst';
import {AdminPage} from './admin';

export const AdminPageEntry: FC<{state: AdminPageState}> = ({state}) => {
  const [store] = useState(() => {
    const store = AdminMst.create({
      directusUrl: state.directusUrl,
    });

    store.init();

    return store;
  });

  return (
    <AdminMstContext.Provider value={store}>
      <AdminPage />
    </AdminMstContext.Provider>
  );
};
