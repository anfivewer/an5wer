import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import {RootPageSsr} from '../components/pages/root/root-ssr';
import {renderRoot} from './util/render-root';

renderRoot({
  stateParser: RootPageState,
  Component: RootPageSsr,
});
