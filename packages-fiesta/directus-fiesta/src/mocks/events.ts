import {CarEvent, CarEventTypeEnum} from '@-/fiesta-types/src/data/events';

type MyEvent = Omit<CarEvent, 'id'> & {index?: number} & (
    | {date: string}
    | {creationDate: string}
    | {type: typeof CarEventTypeEnum.planned}
  );

type MyEventInternal = Omit<CarEvent, 'id'> & {
  index?: number;
  creationDate?: string;
};

const normalizeDateForId = (date?: string): string => {
  if (!date) {
    throw new Error('empty date');
  }

  if (date.length === '2022-01'.length) {
    return `${date}-00`;
  }

  return date;
};

const createEvent = (event: MyEvent): CarEvent => {
  const {type, date, creationDate, mileageKm, index} = event as MyEventInternal;

  return {
    ...event,
    id: [
      normalizeDateForId(
        date || creationDate || (type === 'planned' ? '0000-00-00' : undefined),
      ),
      mileageKm?.toString().padStart(7, '0') || '0000000',
      type,
      ...(index ? [String(index)] : []),
    ].join(':'),
  };
};

export const getMockEvents = (): CarEvent[] => [
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, 22 литра',
    date: '2022-09-04',
    addFuelLiters: 22,
    priceByn: 2.46,
    usdToByn: 2.5517,
  }),
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, 20 литров',
    date: '2022-08-28',
    addFuelLiters: 20,
    priceByn: 2.46,
    usdToByn: 2.5475,
  }),
  createEvent({
    type: CarEventTypeEnum.odometer,
    title: 'одометр',
    date: '2022-08-28',
    mileageKm: 43438,
  }),
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, 20 литров',
    date: '2022-08-06',
    addFuelLiters: 20,
    priceByn: 2.46,
    usdToByn: 2.5952,
  }),
  createEvent({
    type: CarEventTypeEnum.odometer,
    title: 'одометр',
    date: '2022-08-06',
    mileageKm: 43186,
  }),
  createEvent({
    type: CarEventTypeEnum.odometer,
    title: 'одометр',
    date: '2022-07-31',
    mileageKm: 43064,
  }),
  createEvent({
    type: CarEventTypeEnum.odometer,
    title: 'одометр',
    date: '2022-07-26',
    mileageKm: 42940,
  }),
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, 15 литров',
    date: '2022-07-18',
    addFuelLiters: 15,
    priceByn: 2.46,
    usdToByn: 2.5785,
  }),
  createEvent({
    type: CarEventTypeEnum.odometer,
    title: 'одометр',
    date: '2022-07-09',
    mileageKm: 42702,
  }),
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, 20 литров',
    date: '2022-07-04',
    addFuelLiters: 20,
    priceByn: 2.46,
    usdToByn: 2.5979,
  }),
  createEvent({
    type: CarEventTypeEnum.odometer,
    title: 'одометр',
    date: '2022-07-04',
    mileageKm: 42684,
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'покраска левого крыла',
    date: '2022-06-29',
    mileageKm: 42684,
  }),
  createEvent({
    type: CarEventTypeEnum.odometer,
    title: 'одометр',
    date: '2022-06-22',
    mileageKm: 42533,
  }),
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, 20 литров',
    date: '2022-06-11',
    addFuelLiters: 20,
    priceByn: 2.4,
    usdToByn: 2.5613,
  }),
  createEvent({
    type: CarEventTypeEnum.accident,
    title: 'ДТП',
    description:
      'ДТП, повреждение ЛКП передней левой арки и бампера (на стыке выше колеса)',
    date: '2022-06-09',
  }),
  createEvent({
    type: CarEventTypeEnum.odometer,
    title: 'фото одометра',
    mileageKm: 42163,
    date: '2022-05-31',
  }),
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, 20 литров',
    date: '2022-05-22',
    addFuelLiters: 20,
    priceByn: 2.34,
    usdToByn: 2.5043,
  }),
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, 15 литров',
    date: '2022-05-19',
    addFuelLiters: 15,
    priceByn: 2.34,
    usdToByn: 2.5195,
  }),
  createEvent({
    type: CarEventTypeEnum.custom,
    title: 'регистрация',
    description: 'регистрация на нового владельца (меня)',
    date: '2022-05-17',
  }),
  createEvent({
    type: CarEventTypeEnum.fuel,
    title: 'заправка 95, ~19 литров',
    date: '2022-05-15',
    addFuelLiters: 19,
    priceByn: 2.34,
    usdToByn: 2.5008,
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'ТО',
    description: 'ТО, проверка состояния кузова и ЛКП',
    mileageKm: 41339,
    date: '2022-05-12',
    priceByn: 1037.94,
    usdToByn: 2.5945,
  }),
  createEvent({
    type: CarEventTypeEnum.custom,
    title: 'покупка',
    date: '2022-05-07',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'сервис',
    description:
      'проверка уровня технических жидкостей, регулировка ручного тормоза, диагностика течи антифриза',
    date: '2022-05-05',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'развал схождение',
    date: '2022-01-06',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'ТО',
    description:
      'ТО; масло моторное 5W30, фильтр масляный, фильтр воздушный, фильтр салона, диск тормозной передний, колодки тормозные передние, тяга переднего стабилизатора',
    mileageKm: 39586,
    date: '2021-10-29',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'ТО',
    description:
      'ТО; масло моторное 5W30, фильтр масляный, фильтр воздушный, фильтр салона, диск тормозной передний, колодки тормозные передние',
    mileageKm: 32890,
    date: '2020-12-03',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'ТО',
    description:
      'ТО; масло моторное 5W30, фильтр масляный, фильтр воздушный, фильтр салона',
    mileageKm: 29771,
    date: '2020-05-07',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'ТО',
    description:
      'ТО, профилактика тормозов; фильтр масляный, фильтр воздушный, фильтр салона, масло моторное 5W30',
    mileageKm: 22180,
    date: '2018-11-08',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'ТО',
    description:
      'ТО; фильтр масляный, фильтр салона, фильтр воздушный, фильтр вентиляции картерных газов, масло Ford Formula F 5W-30, жидкость тормозная DOT4 LV Ford',
    mileageKm: 16748,
    date: '2017-12-09',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'замена свечей зажигания',
    mileageKm: 7770,
    date: '2017-02-10',
  }),
  createEvent({
    type: CarEventTypeEnum.service,
    title: 'ТО',
    description:
      'ТО; фильтр масляный, фильтр салона, фильтр воздушный, фильтр вентиляции картерных газов, масло Ford Formula F 5W-30',
    mileageKm: 7134,
    date: '2016-12-01',
  }),
  createEvent({
    type: CarEventTypeEnum.custom,
    title: 'покупка',
    description: 'покупка у Фаворит Моторс Ф',
    date: '2016-02-17',
  }),
  createEvent({
    type: CarEventTypeEnum.custom,
    title: 'регистрация',
    description: 'регистрация Ford Sollers',
    date: '2015-10-26',
  }),

  // Planned events
  createEvent({
    type: CarEventTypeEnum.planned,
    title: 'ремень грм',
    date: '2022-07',
    index: 1,
  }),
  createEvent({
    type: CarEventTypeEnum.planned,
    title: 'задние тормоза',
    date: '2022-07',
  }),
  createEvent({
    type: CarEventTypeEnum.planned,
    title: 'передние тормоза',
    mileageKm: 46500,
  }),
  createEvent({
    type: CarEventTypeEnum.planned,
    title: 'ТО',
    mileageKm: 48300,
    date: '2023-05',
  }),
];
