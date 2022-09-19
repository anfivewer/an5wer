import React, {FC} from 'react';
import cn from 'classnames';
import {dateToStr, mileageToStr} from './utils';
import {CarEvent} from '@-/fiesta-types/src/data/events';

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
    <div className="_font-regular-24-24 _mt-4">
      {mileageStr}
      {mileageStr ? <span className="_text-text-secondary"> — </span> : null}
      {dateStr && (
        <span className="_text-text-secondary">
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
    <div className={cn(className, '_flex _flex-col')}>
      <h2 className="_font-header-32-32">{title}</h2>
      <div>
        {events.map((event, i) => (
          <EventRow key={i} event={event} />
        ))}
      </div>
    </div>
  );
};
