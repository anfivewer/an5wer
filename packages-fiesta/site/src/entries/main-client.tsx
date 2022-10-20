import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import {Fiesta} from '../components/pages/fiesta/fiesta';
import {renderRoot} from './util/render-root';

renderRoot({stateParser: RootPageState, Component: Fiesta});
