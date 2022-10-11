import React, {FC} from 'react';
import cn from 'classnames';
import {dateToStr, mileageToStr} from './utils';
import {CarEvent} from '@-/fiesta-types/src/data/events';
import typoStyles from '../../css/typography.module.css';
import utilStyles from '../../css/utility.module.css';

type EventsSectionProps = {
  className?: string;
  title: string;
  events: CarEvent[];
};

const EventRow: FC<{
  event: CarEvent;
}> = ({event}) => {
  const {mileageKm, title, date} = event;

  const mileageStr = mileageToStr(mileageKm || undefined);
  const dateStr = dateToStr(date);

  return (
    <div className={cn(typoStyles.regular24_24, utilStyles.marginTop4)}>
      {mileageStr}
      {mileageStr ? (
        <span className={utilStyles.colorTextSecondary}> — </span>
      ) : null}
      {dateStr && (
        <span className={utilStyles.colorTextSecondary}>
          {dateStr}
          {title ? ', ' : null}
        </span>
      )}
      {title}
    </div>
  );
};

export const EventsSection: FC<EventsSectionProps> = ({
  className,
  title,
  events,
}) => {
  if (!events.length) {
    return null;
  }

  return (
    <div className={cn(className, utilStyles.flexCol)}>
      <h2 className={typoStyles.header32_32}>{title}</h2>
      <div>
        {events.map((event, i) => (
          <EventRow key={i} event={event} />
        ))}
      </div>
    </div>
  );
};
