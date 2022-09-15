import React, {FC, ReactNode} from 'react';
import cn from 'classnames';

type LinkProps = {
  className: string;
  href: string;
  children: ReactNode;
};

export const Link: FC<LinkProps> = ({className, href, children}) => {
  return (
    <a className={cn(className, 'hover:_underline')} href={href}>
      {children}
    </a>
  );
};
