import {
  MainDispatchEventType,
  MainDispatchFn,
} from '../../../state/main/dispatch';
import {MainMst} from '../../../state/main/mst';

export const getDispatch: (options: {
  store: MainMst;
}) => MainDispatchFn = (): MainDispatchFn => {
  return (event) => {
    const eventType = event.type;
    switch (event.type) {
      case MainDispatchEventType.log: {
        const {key, extra} = event;
        console.log(key, extra);
        break;
      }
      case MainDispatchEventType.noop: {
        break;
      }
      default: {
        const shouldBeNever: never = event;
        throw new Error(`unknown event type: ${eventType}`);
      }
    }
  };
};
