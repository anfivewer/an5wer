import {observer} from 'mobx-react-lite';
import React, {FC} from 'react';
import {useMainMst} from '../../../contexts/main';
import styles from './main.module.css';

const MainPage: FC = () => {
  const store = useMainMst();
  const {
    serverState: {answer},
  } = store;

  return <div className={styles.page}>Answer is {answer}</div>;
};

const MainPageWrapped = observer(MainPage);
export {MainPageWrapped as MainPage};
