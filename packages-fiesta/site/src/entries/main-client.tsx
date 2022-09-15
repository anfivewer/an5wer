import React from 'react';
import {hydrateRoot, createRoot} from 'react-dom/client';
import {Fiesta} from '../components/pages/fiesta/fiesta';
import {STATE_KEY} from './constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const state = (window as any)[STATE_KEY];

const rootEl = document.getElementById(state.rootId);

if (rootEl) {
  const app = <Fiesta state={state} />;

  if (rootEl.firstChild) {
    hydrateRoot(rootEl, app);
  } else {
    const root = createRoot(rootEl);
    root.render(app);
  }
}
