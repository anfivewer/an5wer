import {AdminPageState} from '@-/fiesta-types/src/site/state/admin';
import {AdminPage} from '../components/pages/admin/admin';
import {AdminMstContext} from '../contexts/admin-mst';
import {AdminMst} from '../state/admin/mst';
import {renderRootMst} from './util/render-root-mst';

renderRootMst({
  stateParser: AdminPageState,
  Component: AdminPage,
  MstContext: AdminMstContext,
  getMstStore: ({state: {directusUrl}}) => {
    const store = AdminMst.create({
      directusUrl,
    });

    store.init();

    return store;
  },
});
