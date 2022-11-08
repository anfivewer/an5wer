import {AdminPageState} from '@-/fiesta-types/src/site/state/admin';
import {renderRoot} from '@-/frontend/src/render/render-root';
import {AdminPageEntry} from '../components/pages/admin/admin-entry';
import {STATE_KEY} from './constants';

renderRoot({
  stateKey: STATE_KEY,
  stateParser: AdminPageState,
  Component: AdminPageEntry,
});
