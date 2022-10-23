import {createContext, useContext} from 'react';
import {AdminMst} from '../state/admin/mst';

export const AdminMstContext = createContext<AdminMst | undefined>(undefined);
export const useAdminMstContext = () => {
  const store = useContext(AdminMstContext);
  if (!store) {
    throw new Error('No AdminMstContext');
  }

  return store;
};
