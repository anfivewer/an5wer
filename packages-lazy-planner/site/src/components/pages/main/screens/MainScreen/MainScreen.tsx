import React, {FC} from 'react';
import {observer} from 'mobx-react-lite';

import classNames from 'classnames';

import styles from './MainScreen.module.css';
import {useMainStore} from '../../../../../contexts/main';
import {FloatingIconButton} from '../../../../FloatingIconButton/FloatingIconButton';

type MainScreenProps = {
  className?: string;
};

export const MainScreen: FC<MainScreenProps> = observer((props) => {
  const {className} = props;

  const {newTodoRoute} = useMainStore();

  return (
    <div className={classNames(className, styles.wrap)}>
      <FloatingIconButton onClick={newTodoRoute.goTo} />
    </div>
  );
});
