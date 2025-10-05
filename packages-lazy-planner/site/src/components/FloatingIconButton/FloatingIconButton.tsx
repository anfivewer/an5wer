import React, {FC} from 'react';
import {observer} from 'mobx-react-lite';
import {Button, Icon} from '@gravity-ui/uikit';

import classNames from 'classnames';

import styles from './FloatingIconButton.module.css';
import icon from './assets/plus.svg?raw';

type FloatingIconButtonProps = {
  className?: string;
};

export const FloatingIconButton: FC<FloatingIconButtonProps> = observer(
  (props) => {
    const {className} = props;

    return (
      <div className={classNames(className, styles.wrap)}>
        <Button size="xl" pin="circle-circle">
          <Icon data={icon} size={24} />
        </Button>
      </div>
    );
  },
);
