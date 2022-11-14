import {MainPageState} from '@-/sesuritu-types/src/site/state/main';
import {renderRoot} from '@-/frontend/src/render/render-root';
import {MainPageEntry} from '../components/pages/main/main-entry';
import {STATE_KEY} from './constants';

renderRoot({
  stateKey: STATE_KEY,
  stateParser: MainPageState,
  Component: MainPageEntry,
});
