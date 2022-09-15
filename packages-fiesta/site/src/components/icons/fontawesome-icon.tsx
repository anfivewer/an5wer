import React, {FC} from 'react';
import {IconDefinition} from '@fortawesome/free-solid-svg-icons';
import cn from 'classnames';

type FontAwesomeIconProps = {
  className: string;
  icon: IconDefinition;
  size: number;
};

export const FontAwesomeIcon: FC<FontAwesomeIconProps> = ({
  className,
  icon,
  size,
}) => {
  const {
    icon: [width, height, , , pathData],
  } = icon;

  return (
    <svg
      className={cn(className, '_inline-block')}
      viewBox={`0 0 ${width} ${height}`}
      width={size}
      height={size}
    >
      {Array.isArray(pathData) ? (
        pathData.map((path, i) => <path key={i} d={path} />)
      ) : (
        <path d={pathData} />
      )}
    </svg>
  );
};

export const createFontAwesomeIcon = ({icon}: {icon: IconDefinition}) => {
  const Component: FC<Omit<FontAwesomeIconProps, 'icon'>> = (props) => {
    return <FontAwesomeIcon {...props} icon={icon} />;
  };

  return Component;
};
