import React, {FC, ReactNode} from 'react';
import {observer} from 'mobx-react-lite';

import classNames from 'classnames';

import styles from './FullWidthButton.module.css';
import {Button, ButtonProps} from '@gravity-ui/uikit';

type FullWidthButtonProps = Pick<ButtonProps, 'view' | 'disabled'> & {
  className?: string;
  onClick: () => void;
  children: ReactNode;
};

export const FullWidthButton: FC<FullWidthButtonProps> = observer((props) => {
  const {className, view, onClick, disabled, children} = props;

  return (
    <Button
      className={classNames(className, styles.wrap)}
      view={view}
      size="l"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
});
