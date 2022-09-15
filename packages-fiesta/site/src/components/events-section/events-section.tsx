import React, {FC} from 'react';
import cn from 'classnames';
import {MileageTimeEvent} from '../../types/data/car-events';
import {dateToStr, mileageToStr} from './utils';

type EventsSectionProps = {
  className?: string;
  title: string;
  events: MileageTimeEvent[];
};

const EventRow: FC<{
  event: MileageTimeEvent;
}> = ({event}) => {
  const {mileageKm, title, date} = event;

  const mileageStr = mileageToStr(mileageKm);
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
