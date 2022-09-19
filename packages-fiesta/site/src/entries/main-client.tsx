import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import React from 'react';
import {hydrateRoot, createRoot} from 'react-dom/client';
import {Fiesta} from '../components/pages/fiesta/fiesta';
import {STATE_KEY} from './constants';
import {SiteServerState} from './types';

const {rootId, state: rawState} = SiteServerState.parse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[STATE_KEY],
);
const state = RootPageState.parse(rawState);

const rootEl = document.getElementById(rootId);

if (rootEl) {
  const app = <Fiesta state={state} />;

  if (rootEl.firstChild) {
    hydrateRoot(rootEl, app);
  } else {
    const root = createRoot(rootEl);
    root.render(app);
  }
}
