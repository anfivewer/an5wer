import React, {FC, ReactNode, useCallback} from 'react';
import {observer} from 'mobx-react-lite';
import {useAdminMstContext} from '../../../contexts/admin-mst';
import {
  LoginForm,
  LoginFormSubmitOptions,
} from '../../admin/login-form/login-form';
import {CreateEventForm} from '../../admin/create-event-form/create-event-form';

const AdminPage: FC = () => {
  const store = useAdminMstContext();
  const {page} = store;

  const onLoginSubmit = useCallback(
    ({email, password}: LoginFormSubmitOptions) => {
      store.login({email, password});
    },
    [],
  );

  let content: ReactNode = null;

  switch (page.name) {
    case 'notAuthorized': {
      content = (
        <LoginForm onSubmit={onLoginSubmit} disabled={store.isLoginActive} />
      );
      break;
    }
    case 'root': {
      content = (
        <>
          <div>
            <CreateEventForm />
          </div>
          <div>
            <button onClick={store.logout}>Logout</button>
          </div>
        </>
      );
      break;
    }
  }

  return <div>{content}</div>;
};

const AdminPageWrapped = observer(AdminPage);
export {AdminPageWrapped as AdminPage};
