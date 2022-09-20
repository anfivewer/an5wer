import React, {FC} from 'react';
import cn from 'classnames';
import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import '../../../globals/style.css';
import fiestaUrl from './images/fiesta.jpg';
import styles from './fiesta.module.css';
import {TelegramIcon} from '../../icons/telegram';
import {Link} from '../../basic/link/link';
import {EventsSection} from '../../events-section/events-section';

export const Fiesta: FC<{state: RootPageState}> = ({
  state: {events, plannedEvents},
}) => {
  return (
    <div className={cn(styles.page, '_flex _flex-col _p-8')}>
      <div className={cn('_flex _flex-row')}>
        <div className={cn(styles.photo, '_shrink-0', '_mr-8')}>
          <img src={fiestaUrl} />
        </div>
        <div className="_grow">
          <h1 className="_font-header-32-32">Ford Fiesta VI 2015</h1>
          <div
            className={cn(
              styles.plate,
              '_inline-flex',
              '_flex-row',
              '_items-center',
              '_mt-4',
            )}
          >
            <div className="_inline-block _ml-2 _mb-1 _text-ev-plate _self-end _font-mono-16-16">
              BY
            </div>
            <div className="_inline-block _mx-2 _font-mono-medium-32-32">
              5609MP-1
            </div>
          </div>
          <div className="_mt-8 _flex _flex-col _gap-4">
            <div className="_font-regular-24-24">Александр</div>
            <Link className="_font-regular-24-24" href="https://t.me/ruliov">
              <TelegramIcon className="_mr-1" size={24} />
              @ruliov
            </Link>
          </div>
        </div>
      </div>

      <div className="_flex _flex-row _mt-8">
        <EventsSection
          className="_grow"
          title="Последние события"
          events={events}
        />
        <EventsSection
          className="_grow"
          title="Ближайшие обслуживания"
          events={plannedEvents}
        />
      </div>
    </div>
  );
};
