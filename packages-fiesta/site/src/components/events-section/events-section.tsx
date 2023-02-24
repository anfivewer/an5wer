import React, {FC, useCallback} from 'react';
import cn from 'classnames';
import {dateToStr, mileageToStr} from './utils';
import {CarEvent} from '@-/fiesta-types/src/data/events';
import typoStyles from '../../css/typography.module.css';
import utilStyles from '../../css/utility.module.css';
import styles from './events-section.module.css';

type EventsSectionProps = {
  className?: string;
  title: string;
  events: CarEvent[];
  onEventClick?: (event: CarEvent) => void;
};

const EventRow: FC<{
  className?: string;
  event: CarEvent;
  onClick?: (event: CarEvent) => void;
  isLast?: boolean;
}> = ({className, event, onClick, isLast = false}) => {
  const {mileageKm, title, date} = event;

  const mileageStr = mileageToStr(mileageKm || undefined);
  const dateStr = dateToStr(date);

  const handleClick = useCallback(() => {
    onClick?.(event);
  }, [event]);

  return (
    <div
      className={cn(
        className,
        styles.eventRow,
        typoStyles.regular24_24,
        utilStyles.marginTop4,
        isLast && styles.isLast,
      )}
      onClick={handleClick}
    >
      {mileageStr}
      {mileageStr ? <span className={styles.textSecondary}> — </span> : null}
      {dateStr && (
        <span className={styles.textSecondary}>
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
  onEventClick,
}) => {
  if (!events.length) {
    return null;
  }

  return (
    <div className={cn(className, utilStyles.flexCol)}>
      <h2 className={cn(styles.eventsTitle, typoStyles.header32_32)}>
        {title}
      </h2>
      <div className={styles.eventsList}>
        {events.slice(0, 10).map((event, i) => (
          <EventRow
            key={i}
            event={event}
            onClick={onEventClick}
            isLast={i === 9}
          />
        ))}
      </div>
    </div>
  );
};
