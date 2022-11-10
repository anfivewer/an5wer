import {FC, ReactElement, useLayoutEffect, useState} from 'react';

export const NoSsr: FC<{children: ReactElement | null}> = ({children}) => {
  const [show, setShow] = useState(false);

  if (typeof window !== 'undefined') {
    useLayoutEffect(() => {
      setShow(true);
    }, []);
  }

  return show ? children : null;
};
