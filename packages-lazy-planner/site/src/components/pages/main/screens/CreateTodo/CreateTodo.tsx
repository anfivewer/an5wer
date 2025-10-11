import React, {FC} from 'react';
import {observer} from 'mobx-react-lite';

import classNames from 'classnames';

import styles from './CreateTodo.module.css';
import {useMainStore} from '../../../../../contexts/main';
import {FullWidthButton} from '../../../../FullWidthButton/FullWidthButton';
import {i18n} from './i18n';
import {noop} from '@-/util/src/fn/noop';
import {Modal} from '../../../../Modal/Modal';
import {ConfirmContent} from '../../../../ConfirmContent/ConfirmContent';
import wind from '@/styles/wind.module.css';

type CreateTodoProps = {
  className?: string;
};

export const CreateTodo: FC<CreateTodoProps> = observer((props) => {
  const {className} = props;

  const mainStore = useMainStore();

  const createTodoStore = mainStore.getCreateTodoStore();

  return (
    <div className={classNames(className, styles.wrap)}>
      <FullWidthButton view="action" onClick={noop}>
        {i18n('save')}
      </FullWidthButton>
      <FullWidthButton
        className={wind.marginTopSizeS}
        onClick={createTodoStore.onCancelClick}
      >
        {i18n('cancel')}
      </FullWidthButton>
      <Modal
        isVisible={createTodoStore.isCancelConfirmVisible}
        onClose={createTodoStore.onCancelReject}
      >
        <ConfirmContent
          title={i18n('cancelConfirmTitle')}
          onNo={createTodoStore.onCancelReject}
          onYes={createTodoStore.onCancelConfirm}
        />
      </Modal>
    </div>
  );
});
