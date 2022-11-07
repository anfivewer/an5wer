import React, {Context, ReactNode} from 'react';
import {renderRoot, RenderRootBaseOptions} from './render-root';

export const renderRootMst = <ServerState, MstState, DispatchFn>(
  options: RenderRootBaseOptions<ServerState> &
    ({
      getMstStore: (options: {state: ServerState}) => NonNullable<MstState>;
      MstContext: Context<MstState>;
    } & (
      | {
          getDispatch: (options: {store: NonNullable<MstState>}) => DispatchFn;
          DispatchContext: Context<DispatchFn>;
        }
      | {
          getDispatch?: undefined;
          DispatchContext?: undefined;
        }
    )),
) => {
  const {
    getMstStore,
    MstContext,
    getDispatch,
    DispatchContext,
    ...restOptions
  } = options;

  return renderRoot({
    ...restOptions,
    createDerivedState: getMstStore,
    wrap: ({
      children,
      derivedState,
    }: {
      children: ReactNode;
      derivedState: NonNullable<MstState>;
    }) => {
      const dispatch = getDispatch?.({store: derivedState});

      let wrapped = (
        <MstContext.Provider value={derivedState}>
          {children}
        </MstContext.Provider>
      );

      if (dispatch && DispatchContext) {
        wrapped = (
          <DispatchContext.Provider value={dispatch}>
            {wrapped}
          </DispatchContext.Provider>
        );
      }

      return wrapped;
    },
  });
};
