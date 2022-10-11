import React, {FC, ReactNode} from 'react';
import cn from 'classnames';
import styles from './link.module.css';

type LinkProps = {
  className: string;
  href: string;
  children: ReactNode;
};

export const Link: FC<LinkProps> = ({className, href, children}) => {
  return (
    <a className={cn(className, styles.link)} href={href}>
      {children}
    </a>
  );
};
