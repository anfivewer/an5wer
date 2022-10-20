import React, {FC} from 'react';
import {useField} from '@-/util-react/src/hooks/use-field';

export type LoginFormSubmitOptions = {email: string; password: string};

export const LoginForm: FC<{
  onSubmit: (options: LoginFormSubmitOptions) => void;
  disabled?: boolean;
}> = ({onSubmit, disabled}) => {
  const {value: email, onChange: onChangeEmail} = useField();
  const {value: password, onChange: onChangePassword} = useField();

  const submitHandler = () => {
    onSubmit({email, password});
  };

  return (
    <div>
      <div>
        <input
          type="text"
          value={email}
          onChange={onChangeEmail}
          disabled={disabled}
        />
      </div>
      <div>
        <input
          type="password"
          value={password}
          onChange={onChangePassword}
          disabled={disabled}
        />
      </div>
      <div>
        <button onClick={submitHandler} disabled={disabled}>
          Submit
        </button>
      </div>
    </div>
  );
};
