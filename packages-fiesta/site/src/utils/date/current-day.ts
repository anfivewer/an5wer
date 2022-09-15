const MINUTE_TO_MS = 60 * 1000;
const HOUR_TO_MS = 60 * MINUTE_TO_MS;

let date: Date | undefined = undefined;

const loop = (): Date => {
  date = new Date();

  const msToNextDay =
    24 * HOUR_TO_MS -
    (date.getHours() * HOUR_TO_MS + date.getMinutes() * MINUTE_TO_MS) +
    1500;

  setTimeout(() => {
    loop();
  }, msToNextDay);

  return date;
};

export const getCurrentDayDate = (): Date => {
  if (!date) {
    date = loop();
  }

  return date;
};
