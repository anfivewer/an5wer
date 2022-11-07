import {observer} from 'mobx-react-lite';
import React, {FC, ReactNode} from 'react';
import {useRootMst} from '../../../contexts/root';
import {PageName} from '../../../state/root/pages/name';
import {Fiesta} from '../fiesta/fiesta';

const RootPage: FC = () => {
  const store = useRootMst();
  const {page} = store;

  let content: ReactNode = null;

  const pageName = page.name;
  switch (page.name) {
    case PageName.car:
      content = <Fiesta state={store.serverState} />;
      break;
    case PageName.carEvents:
      break;
    default: {
      const shouldBeNever: never = page;
      throw new Error(`unknown page: ${pageName}`);
    }
  }
  return <>{content}</>;
};

const RootPageWrapped = observer(RootPage);
export {RootPageWrapped as RootPage};
