import {CarEvent} from '@-/fiesta-types/src/data/events';
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

export const dateToStr = (date: CarEvent['date']): string | null => {
  if (!date) {
    return null;
  }

  const match = /^(\d\d\d\d)-(\d\d)(?:-(\d\d))?$/.exec(date);
  if (!match) {
    console.error(`Invalid date format: ${date}`);
    return null;
  }

  const [year, month, day] = match.slice(1).map((x) => parseInt(x, 10));

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
