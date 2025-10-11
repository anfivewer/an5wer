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
import {Text, TextInput} from '@gravity-ui/uikit';

type CreateTodoProps = {
  className?: string;
};

export const CreateTodo: FC<CreateTodoProps> = observer((props) => {
  const {className} = props;

  const mainStore = useMainStore();

  const createTodoStore = mainStore.getCreateTodoStore();

  return (
    <div className={classNames(className, styles.wrap)}>
      <TextInput
        size="l"
        value={createTodoStore.todo.title.value}
        onChange={createTodoStore.todo.title.onChange}
        placeholder={i18n('titlePlaceholder')}
      />
      <TextInput
        className={wind.marginTopSizeS}
        size="l"
        value={createTodoStore.todo.estimateDurationText.value}
        onChange={createTodoStore.todo.estimateDurationText.onChange}
        label={i18n('estimateDuration')}
        note={
          <Text variant="caption-1" color="secondary">
            {i18n('estimateDurationNote')}
          </Text>
        }
        validationState={
          createTodoStore.todo.estimateDuration === 'invalid'
            ? 'invalid'
            : undefined
        }
      />
      <div className={styles.spacer} />
      <FullWidthButton
        className={wind.marginTopSizeL}
        view="action"
        onClick={noop}
        disabled={createTodoStore.isSaveDisabled}
      >
        {i18n('save')}
      </FullWidthButton>
      <FullWidthButton
        className={wind.marginTopSizeS}
        onClick={createTodoStore.onCancelClick}
        view={createTodoStore.todo.isChanged ? 'normal' : 'action'}
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
