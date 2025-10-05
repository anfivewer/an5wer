import React, {FC} from 'react';
import {observer} from 'mobx-react-lite';

import classNames from 'classnames';

import styles from './CreateTodo.module.css';
import {useMainStore} from '../../../../../contexts/main';
import {Button} from '@gravity-ui/uikit';

type CreateTodoProps = {
  className?: string;
};

export const CreateTodo: FC<CreateTodoProps> = observer((props) => {
  const {className} = props;

  const {mainRoute} = useMainStore();

  return (
    <div className={classNames(className, styles.wrap)}>
      <Button onClick={mainRoute.goTo}>Cancel</Button>
    </div>
  );
});
