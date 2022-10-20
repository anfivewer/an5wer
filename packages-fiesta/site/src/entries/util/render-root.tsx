import React, {ComponentType, ReactNode} from 'react';
import {hydrateRoot, createRoot} from 'react-dom/client';
import {STATE_KEY} from '../constants';
import {SiteServerState} from '../types';

export type RenderRootBaseOptions<ServerState> = {
  stateParser: {parse: (value: unknown) => ServerState};
  Component: ComponentType<{state: ServerState}>;
};

export const renderRoot = <ServerState, DerivedState = undefined>(
  options: RenderRootBaseOptions<ServerState> &
    (
      | {
          wrap: (options: {
            children: ReactNode;
            derivedState: DerivedState;
          }) => ReactNode;
          createDerivedState: (options: {state: ServerState}) => DerivedState;
        }
      | {
          wrap?: (options: {
            children: ReactNode;
            derivedState: undefined;
          }) => ReactNode;
          createDerivedState?: never;
        }
    ),
) => {
  const {stateParser, Component} = options;

  const {rootId, state: rawState} = SiteServerState.parse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[STATE_KEY],
  );
  const state = stateParser.parse(rawState);

  let getAppNode: () => ReactNode;

  if (options.createDerivedState) {
    const {createDerivedState, wrap = noopWrap} = options;
    const derivedState = createDerivedState({state});

    getAppNode = () =>
      wrap({children: <Component state={state} />, derivedState});
  } else {
    const {wrap = noopWrap} = options;

    getAppNode = () =>
      wrap({children: <Component state={state} />, derivedState: undefined});
  }

  const rootEl = document.getElementById(rootId);

  if (rootEl) {
    const app = getAppNode();

    if (rootEl.firstChild) {
      hydrateRoot(rootEl, app);
    } else {
      const root = createRoot(rootEl);
      root.render(app);
    }
  }
};

const noopWrap = ({children}: {children: ReactNode}) => children;
