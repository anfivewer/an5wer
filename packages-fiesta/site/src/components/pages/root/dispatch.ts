import {
  RootDispatchEvent,
  RootDispatchEventType,
} from '../../../state/root/dispatch';
import {RootMst} from '../../../state/root/mst';
import {PageName} from '../../../state/root/pages/name';

export const getDispatch = ({store}: {store: RootMst}) => {
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
};
