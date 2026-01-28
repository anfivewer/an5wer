import {UTCDate} from '@date-fns/utc';
import {format} from 'date-fns';
import {UtcDay} from './types';

export const currentDay = (): UtcDay => {
  const date = new UTCDate();

  return format(date, 'yyyy-MM-dd') as UtcDay;
};
