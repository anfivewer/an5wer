import {MileageTimeEvent} from '../../types/data/car-events';
import {getCurrentDayDate} from '../../utils/date/current-day';

export const mileageToStr = (
  mileage: number | undefined,
): string | undefined => {
  if (!mileage) {
    return undefined;
  }

  return `${mileage} км`;
};

const months = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

const monthsWithDay = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const dateToStr = (date: MileageTimeEvent['date']): string | null => {
  if (!date) {
    return null;
  }

  const {year, month, day} = date;

  const currentDayDate = getCurrentDayDate();

  const parts: string[] = [];

  if (day) {
    parts.push(String(day));
  }

  parts.push((day ? monthsWithDay : months)[month - 1]);

  if (year !== currentDayDate.getFullYear()) {
    parts.push(String(year));
  }

  return parts.join(' ');
};
