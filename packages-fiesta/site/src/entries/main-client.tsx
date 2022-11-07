import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import {RootPage} from '../components/pages/root/root';
import {RootDispatchContext, RootMstContext} from '../contexts/root';
import {RootDispatchEvent, RootDispatchEventType} from '../state/root/dispatch';
import {RootMst} from '../state/root/mst';
import {PageName} from '../state/root/pages/name';
import {renderRootMst} from './util/render-root-mst';

renderRootMst({
  stateParser: RootPageState,
  isTrivialComponent: true,
  Component: RootPage,
  MstContext: RootMstContext,
  getMstStore: ({state}) => {
    const store = RootMst.create({
      page: {
        name: PageName.car,
      },
      serverState: state,
    });

    return store;
  },
  DispatchContext: RootDispatchContext,
  getDispatch: ({store}) => {
    return (event: RootDispatchEvent) => {
      switch (event.type) {
        case RootDispatchEventType.switchPage: {
          const {page} = event;
          const pageName = page.name;
          switch (page.name) {
            case PageName.car:
              store.setPage({name: PageName.car});
              break;
            case PageName.carEvents:
              store.setPage({name: PageName.carEvents});
              break;
            default: {
              const shouldBeNever: never = page;
              throw new Error(`unknown page: ${pageName}`);
            }
          }
          break;
        }
        default: {
          const shouldBeNever: never = event.type;
          throw new Error(`unknown event type: ${event.type}`);
        }
      }
    };
  },
});
