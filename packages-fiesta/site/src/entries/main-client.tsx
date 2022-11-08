import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import {Fiesta} from '../components/pages/fiesta/fiesta';
import {renderRoot} from '@-/frontend/src/render/render-root';
import {STATE_KEY} from './constants';

renderRoot({
  stateKey: STATE_KEY,
  stateParser: RootPageState,
  Component: Fiesta,
});
