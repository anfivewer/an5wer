import React, {FC, ReactNode, useCallback} from 'react';
import {observer} from 'mobx-react-lite';
import {Modal as GravityModal} from '@gravity-ui/uikit';

import classNames from 'classnames';

import styles from './Modal.module.css';

type ModalProps = {
  className?: string;
  isVisible: () => boolean;
  onClose: () => void;
  children: ReactNode;
};

export const Modal: FC<ModalProps> = observer((props) => {
  const {className, isVisible, onClose, children} = props;

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        return;
      }

      onClose();
    },
    [onClose],
  );

  return (
    <GravityModal
      className={classNames(className, styles.wrap)}
      open={isVisible()}
      onOpenChange={onOpenChange}
    >
      {children}
    </GravityModal>
  );
});
