import {ChangeEvent, useCallback, useState} from 'react';

export const useField = ({defaultValue = ''}: {defaultValue?: string} = {}) => {
  const [value, setValue] = useState(defaultValue);

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValue(e.target.value);
    },
    [],
  );

  return {value, setValue, onChange};
};
