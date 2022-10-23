import React, {FC} from 'react';
import cn from 'classnames';
import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import '../../../css/global.css';
import fiestaUrl from './images/fiesta.jpg';
import styles from './fiesta.module.css';
import {TelegramIcon} from '../../icons/telegram';
import {Link} from '../../basic/link/link';
import {EventsSection} from '../../events-section/events-section';
import typoStyles from '../../../css/typography.module.css';
import utilStyles from '../../../css/utility.module.css';

export const Fiesta: FC<{state: RootPageState}> = ({
  state: {events, plannedEvents, totalConsumption},
}) => {
  const consumptionFields = (() => {
    if (!totalConsumption) {
      return null;
    }

    const {
      totalDistance,
      totalLiters,
      notCalculatedLiters,
      consumptionPer100km,
      pessimisticConsumptionPer100km,
    } = totalConsumption;

    const consumption = Math.round(consumptionPer100km * 100) / 100;
    const pessimisticConsumption =
      Math.round(pessimisticConsumptionPer100km * 100) / 100;

    return [
      ['Проехано:', `${totalDistance}км`],
      [
        'Бензина сожжено:',
        notCalculatedLiters ? (
          <>
            {`${totalLiters}л`}
            <span
              className={cn(
                typoStyles.regular24_24,
                utilStyles.colorTextSecondary,
              )}
            >
              {' + ≈'}
              {notCalculatedLiters}л?
            </span>
          </>
        ) : (
          `${totalLiters}л`
        ),
      ],
      ...(consumption === pessimisticConsumption
        ? [['Расход:', `${consumption}л/100км`]]
        : [
            ['🤗 расход:', `${consumption}л/100км`],
            ['😢 расход:', `${pessimisticConsumption}л/100км`],
          ]),
    ];
  })();

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.avatar}>
          <img src={fiestaUrl} />
        </div>
        <div className={styles.info}>
          <h1 className={typoStyles.header32_32}>Ford Fiesta VI 2015</h1>
          <div className={styles.plate}>
            <div className={styles.plateCountry}>BY</div>
            <div className={styles.plateNumber}>5609MP-1</div>
          </div>
          <div className={styles.infoList}>
            <div className={typoStyles.regular24_24}>Александр</div>
            <Link
              className={cn(
                utilStyles.inlineFlexAlignItemsCenter,
                typoStyles.regular24_24,
              )}
              href="https://t.me/ruliov"
            >
              <TelegramIcon className={utilStyles.marginRight1} size={24} />
              @ruliov
            </Link>
            {consumptionFields?.map(([title, text], i) => (
              <div key={i}>
                <span
                  className={cn(
                    typoStyles.regular24_24,
                    utilStyles.colorTextSecondary,
                  )}
                >
                  {title}
                </span>{' '}
                <span className={typoStyles.regular24_24}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.events}>
        <EventsSection
          className={styles.eventsFirst}
          title="Последние события"
          events={events}
        />
        <EventsSection
          className={styles.eventsSecond}
          title="Ближайшие обслуживания"
          events={plannedEvents}
        />
      </div>
    </div>
  );
};
