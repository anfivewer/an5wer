import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import {RootPageSsr} from '../components/pages/root/root-ssr';
import {renderRoot} from '@-/frontend/src/render/render-root';
import {STATE_KEY} from './constants';

renderRoot({
  stateKey: STATE_KEY,
  stateParser: RootPageState,
  Component: RootPageSsr,
});
