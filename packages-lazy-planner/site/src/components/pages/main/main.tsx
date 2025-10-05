import {observer} from 'mobx-react-lite';
import React, {FC} from 'react';
import {useMainStore} from '../../../contexts/main';
import styles from './main.module.css';
import {FloatingIconButton} from '../../FloatingIconButton/FloatingIconButton';
import {MainRoute} from '../../../state/main/routes/main';

export const MainPage: FC = observer(() => {
  const store = useMainStore();
  const {
    serverState: {answer},
  } = store;

  const page = store.router.activeRoute instanceof MainRoute ? 'main' : 'new';

  return (
    <div className={styles.page}>
      Answer is {answer}, page {page}, route{' '}
      {store.router.activeRoute ? '1' : '0'}
      <FloatingIconButton />
    </div>
  );
});
