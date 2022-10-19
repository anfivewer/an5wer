import React, {Context, ReactNode} from 'react';
import {renderRoot, RenderRootBaseOptions} from './render-root';

export const renderRootMst = <ServerState, MstState>({
  stateParser,
  Component,
  getMstStore,
  MstContext,
}: RenderRootBaseOptions<ServerState> & {
  getMstStore: (options: {state: ServerState}) => MstState;
  MstContext: Context<MstState>;
}) => {
  return renderRoot({
    stateParser,
    Component,
    createDerivedState: getMstStore,
    wrap: ({
      children,
      derivedState,
    }: {
      children: ReactNode;
      derivedState: MstState;
    }) => {
      return (
        <MstContext.Provider value={derivedState}>
          {children}
        </MstContext.Provider>
      );
    },
  });
};
