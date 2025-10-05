import React, {FC} from 'react';
import {observer} from 'mobx-react-lite';

import classNames from 'classnames';

import styles from './CreateTodo.module.css';

type CreateTodoProps = {
  className?: string;
};

export const CreateTodo: FC<CreateTodoProps> = observer((props) => {
  const {className} = props;

  return <div className={classNames(className, styles.wrap)}>42</div>;
});
