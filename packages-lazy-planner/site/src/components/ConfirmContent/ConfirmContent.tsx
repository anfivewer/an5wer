import React, {FC} from 'react';
import {observer} from 'mobx-react-lite';

import classNames from 'classnames';

import styles from './ConfirmContent.module.css';
import {Button} from '@gravity-ui/uikit';
import {i18n} from './i18n';

type ConfirmContentProps = {
  className?: string;
  title: string;
  onNo: () => void;
  onYes: () => void;
};

export const ConfirmContent: FC<ConfirmContentProps> = observer((props) => {
  const {className, title, onNo, onYes} = props;

  return (
    <div className={classNames(className, styles.wrap)}>
      <div className={styles.title}>{title}</div>
      <div className={styles.buttons}>
        <Button className={styles.button} onClick={onNo}>
          {i18n('no')}
        </Button>
        <Button className={styles.button} view="action" onClick={onYes}>
          {i18n('yes')}
        </Button>
      </div>
    </div>
  );
});
