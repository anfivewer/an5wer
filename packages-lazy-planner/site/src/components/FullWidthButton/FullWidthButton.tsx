import React, {FC, ReactNode} from 'react';
import {observer} from 'mobx-react-lite';

import classNames from 'classnames';

import styles from './FullWidthButton.module.css';
import {Button, ButtonProps} from '@gravity-ui/uikit';

type FullWidthButtonProps = {
  className?: string;
  view?: ButtonProps['view'];
  onClick: () => void;
  children: ReactNode;
};

export const FullWidthButton: FC<FullWidthButtonProps> = observer((props) => {
  const {className, view, onClick, children} = props;

  return (
    <Button
      className={classNames(className, styles.wrap)}
      view={view}
      size="l"
      onClick={onClick}
    >
      {children}
    </Button>
  );
});
