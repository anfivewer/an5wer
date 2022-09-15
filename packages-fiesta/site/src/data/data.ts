import {CarData} from '../types/data/car-data';
import {MileageTimeEvent, MileageTimeEventType} from '../types/data/car-events';
import photo2022_05_31 from './photos/2022-05-31.jpg';

const createEvent = ({
  date,
  dateStr,
  imageUrl,
  ...props
}: MileageTimeEvent & {
  dateStr?: string;
  imageUrl?: string;
}): MileageTimeEvent => {
  return {
    images: imageUrl ? [{url: imageUrl}] : undefined,
    ...props,
    date: date || parseDate(dateStr),
  };
};

const parseDate = (dateStr: string | undefined): MileageTimeEvent['date'] => {
  if (!dateStr) {
    return undefined;
  }

  const match = /^(\d\d\d\d)-(\d\d)(?:-(\d\d))$/.exec(dateStr);
  if (!match) {
    throw new Error(`invalid date: ${dateStr}`);
  }

  const [, year, month, day] = match;

  return {
    year: parseInt(year, 10),
    month: parseInt(month, 10),
    day: typeof day === 'string' ? parseInt(day, 10) : undefined,
  };
};

export const fiestaData: CarData = {
  events: [
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, 22 литра',
      dateStr: '2022-09-04',
      addFuelLiters: 22,
      price: {byn: 54.12, usd: 21.21},
    }),
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, 20 литров',
      dateStr: '2022-08-28',
      addFuelLiters: 20,
      price: {byn: 49.2, usd: 19.31},
    }),
    createEvent({
      type: MileageTimeEventType.odometer,
      title: 'одометр',
      dateStr: '2022-08-28',
      mileageKm: 43438,
    }),
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, 20 литров',
      dateStr: '2022-08-06',
      addFuelLiters: 20,
      price: {byn: 49.2, usd: 18.96},
    }),
    createEvent({
      type: MileageTimeEventType.odometer,
      title: 'одометр',
      dateStr: '2022-08-06',
      mileageKm: 43186,
    }),
    createEvent({
      type: MileageTimeEventType.odometer,
      title: 'одометр',
      dateStr: '2022-07-31',
      mileageKm: 43064,
    }),
    createEvent({
      type: MileageTimeEventType.odometer,
      title: 'одометр',
      dateStr: '2022-07-26',
      mileageKm: 42940,
    }),
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, 15 литров',
      dateStr: '2022-07-18',
      addFuelLiters: 15,
      price: {byn: 36.9, usd: 14.39},
    }),
    createEvent({
      type: MileageTimeEventType.odometer,
      title: 'одометр',
      dateStr: '2022-07-09',
      mileageKm: 42702,
    }),
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, 20 литров',
      dateStr: '2022-07-04',
      addFuelLiters: 20,
      price: {byn: 49.2, usd: 18.94},
    }),
    createEvent({
      type: MileageTimeEventType.odometer,
      title: 'одометр',
      dateStr: '2022-07-04',
      mileageKm: 42684,
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'покраска левого крыла',
      dateStr: '2022-06-29',
      mileageKm: 42684,
    }),
    createEvent({
      type: MileageTimeEventType.odometer,
      title: 'одометр',
      dateStr: '2022-06-22',
      mileageKm: 42533,
    }),
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, 20 литров',
      dateStr: '2022-06-11',
      addFuelLiters: 20,
      price: {byn: 48, usd: 18.74},
    }),
    createEvent({
      type: MileageTimeEventType.accident,
      title: 'ДТП',
      description:
        'ДТП, повреждение ЛКП передней левой арки и бампера (на стыке выше колеса)',
      dateStr: '2022-06-09',
    }),
    createEvent({
      type: MileageTimeEventType.odometer,
      title: 'фото одометра',
      mileageKm: 42163,
      dateStr: '2022-05-31',
      imageUrl: photo2022_05_31,
    }),
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, 20 литров',
      dateStr: '2022-05-22',
      addFuelLiters: 20,
      price: {byn: 46.8, usd: 18.69},
    }),
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, 15 литров',
      dateStr: '2022-05-19',
      addFuelLiters: 15,
      price: {byn: 35.1, usd: 13.93},
    }),
    createEvent({
      type: MileageTimeEventType.custom,
      title: 'регистрация',
      description: 'регистрация на нового владельца (меня)',
      dateStr: '2022-05-17',
    }),
    createEvent({
      type: MileageTimeEventType.fuel,
      title: 'заправка 95, ~19 литров',
      dateStr: '2022-05-15',
      addFuelLiters: 19,
      price: {byn: 44.52, usd: 17.8},
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ТО',
      description: 'ТО, проверка состояния кузова и ЛКП',
      mileageKm: 41339,
      dateStr: '2022-05-12',
      price: {byn: 1037.94, usd: 400.05},
    }),
    createEvent({
      type: MileageTimeEventType.custom,
      title: 'покупка',
      dateStr: '2022-05-07',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'сервис',
      description:
        'проверка уровня технических жидкостей, регулировка ручного тормоза, диагностика течи антифриза',
      dateStr: '2022-05-05',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'развал схождение',
      dateStr: '2022-01-06',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ТО',
      description:
        'ТО; масло моторное 5W30, фильтр масляный, фильтр воздушный, фильтр салона, диск тормозной передний, колодки тормозные передние, тяга переднего стабилизатора',
      mileageKm: 39586,
      dateStr: '2021-10-29',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ТО',
      description:
        'ТО; масло моторное 5W30, фильтр масляный, фильтр воздушный, фильтр салона, диск тормозной передний, колодки тормозные передние',
      mileageKm: 32890,
      dateStr: '2020-12-03',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ТО',
      description:
        'ТО; масло моторное 5W30, фильтр масляный, фильтр воздушный, фильтр салона',
      mileageKm: 29771,
      dateStr: '2020-05-07',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ТО',
      description:
        'ТО, профилактика тормозов; фильтр масляный, фильтр воздушный, фильтр салона, масло моторное 5W30',
      mileageKm: 22180,
      dateStr: '2018-11-08',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ТО',
      description:
        'ТО; фильтр масляный, фильтр салона, фильтр воздушный, фильтр вентиляции картерных газов, масло Ford Formula F 5W-30, жидкость тормозная DOT4 LV Ford',
      mileageKm: 16748,
      dateStr: '2017-12-09',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'замена свечей зажигания',
      mileageKm: 7770,
      dateStr: '2017-02-10',
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ТО',
      description:
        'ТО; фильтр масляный, фильтр салона, фильтр воздушный, фильтр вентиляции картерных газов, масло Ford Formula F 5W-30',
      mileageKm: 7134,
      dateStr: '2016-12-01',
    }),
    createEvent({
      type: MileageTimeEventType.custom,
      title: 'покупка',
      description: 'покупка у Фаворит Моторс Ф',
      dateStr: '2016-02-17',
    }),
    createEvent({
      type: MileageTimeEventType.custom,
      title: 'регистрация',
      description: 'регистрация Ford Sollers',
      dateStr: '2015-10-26',
    }),
  ],
  scheduledService: [
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ремень грм',
      date: {year: 2022, month: 7},
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'задние тормоза',
      date: {year: 2022, month: 7},
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'передние тормоза',
      mileageKm: 46500,
    }),
    createEvent({
      type: MileageTimeEventType.service,
      title: 'ТО',
      mileageKm: 48300,
      date: {year: 2023, month: 5},
    }),
  ],
};
