import React, {ComponentType, ReactNode} from 'react';
import {hydrateRoot, createRoot} from 'react-dom/client';
import {SiteServerState} from './types';

export type RenderRootBaseOptions<ServerState> = {
  stateKey: string;
  stateParser: {parse: (value: unknown) => ServerState};
} & (
  | {isTrivialComponent: true; Component: ComponentType<Record<string, never>>}
  | {
      isTrivialComponent?: undefined;
      Component: ComponentType<{state: ServerState}>;
    }
);

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
  const {stateKey, stateParser} = options;

  const getComponentNode = (state: ServerState) =>
    options.isTrivialComponent ? (
      <options.Component />
    ) : (
      <options.Component state={state} />
    );

  const {rootId, state: rawState} = SiteServerState.parse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[stateKey],
  );
  const state = stateParser.parse(rawState);

  let getAppNode: () => ReactNode;

  if (options.createDerivedState) {
    const {createDerivedState, wrap = noopWrap} = options;
    const derivedState = createDerivedState({state});

    getAppNode = () =>
      wrap({
        children: getComponentNode(state),
        derivedState,
      });
  } else {
    const {wrap = noopWrap} = options;

    getAppNode = () =>
      wrap({
        children: getComponentNode(state),
        derivedState: undefined,
      });
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
