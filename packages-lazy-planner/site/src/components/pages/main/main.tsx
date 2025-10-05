import {observer} from 'mobx-react-lite';
import React, {FC, ReactNode} from 'react';
import {useMainStore} from '../../../contexts/main';
import styles from './main.module.css';
import {MainScreen} from './screens/MainScreen/MainScreen';
import {CreateTodo} from './screens/CreateTodo/CreateTodo';

export const MainPage: FC = observer(() => {
  const store = useMainStore();

  let content: ReactNode = null;

  switch (store.router.activeRoute) {
    case store.mainRoute:
      content = <MainScreen />;
      break;
    case store.newTodoRoute:
      content = <CreateTodo />;
      break;
    default:
      content = '404';
  }

  return <div className={styles.page}>{content}</div>;
});
