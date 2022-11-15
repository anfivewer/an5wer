import {CarEvent, CarEventType} from '@-/fiesta-types/src/data/events';
import React, {FC, ReactNode, useCallback} from 'react';
import cn from 'classnames';
import {useRootDispatch, useRootMst} from '../../../contexts/root';
import {RootDispatchEventType} from '../../../state/root/dispatch';
import {PageName} from '../../../state/root/pages/name';
import styles from './events.module.css';

const EventCard: FC<{className?: string; event: CarEvent}> = ({
  className,
  event,
}) => {
  const {title, date, description, mileageKm, type} = event;
  return (
    <div className={cn(className, styles.eventCard)}>
      <div>
        {mileageKm ? <span>{mileageKm} км</span> : null}
        {mileageKm && date ? ' ' : null}
        {date ? (
          <span className={styles.eventCardDate}>
            {mileageKm ? '— ' : null}
            {date}
          </span>
        ) : null}
      </div>
      <div>
        {type === CarEventType.fuel ? '⛽︎' : null}
        {type === CarEventType.odometer ? '🚙💨' : null}
        {type === CarEventType.accident ? '🚨' : null}
        {type === CarEventType.service ? '🔧' : null}
        {type === CarEventType.custom ? '👽' : null}
        {type === CarEventType.planned ? '📆' : null}
        {title}
      </div>
      {description ? <div>{description}</div> : null}
    </div>
  );
};

export const EventsPage: FC = () => {
  const {serverState} = useRootMst();
  const dispatch = useRootDispatch();

  const goBack = useCallback(() => {
    dispatch({
      type: RootDispatchEventType.switchPage,
      page: {
        name: PageName.car,
      },
    });
  }, [dispatch]);

  const eventPairs: [ReactNode, ReactNode][] = [];

  for (let i = 0; i < serverState.events.length; i += 2) {
    const first = serverState.events[i];
    const second = serverState.events[i + 1];

    eventPairs.push([
      <EventCard className={styles.cardContainer} event={first} />,
      second ? (
        <EventCard className={styles.cardContainer} event={second} />
      ) : (
        <div
          className={cn(
            styles.cardContainer,
            styles.eventCard,
            styles.withoutBorder,
          )}
        />
      ),
    ]);
  }

  return (
    <div className={styles.page}>
      <div className={styles.titleContainer}>
        <button className={styles.backButton} onClick={goBack}>
          <span className={styles.arrow}>←</span> Последние события
        </button>
      </div>
      <div className={styles.eventCards}>
        {eventPairs.map(([first, second]) => (
          <div className={styles.cardsRow}>
            {first}
            {second}
          </div>
        ))}
      </div>
    </div>
  );
};
