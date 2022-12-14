// const MONTHS: Record<number, string> = {
//   0: 'January',
//   1: 'February',
//   2: 'March',
//   3: 'April',
//   4: 'May',
//   5: 'June',
//   6: 'July',
//   7: 'August',
//   8: 'September',
//   9: 'October',
//   10: 'November',
//   11: 'December',
// };

const MONTHS_SHORT: Record<number, string> = {
  0: 'Jan',
  1: 'Feb',
  2: 'Mar',
  3: 'Apr',
  4: 'May',
  5: 'Jun',
  6: 'Jul',
  7: 'Aug',
  8: 'Sep',
  9: 'Oct',
  10: 'Nov',
  11: 'Dec',
};

export const timestampMsToChartTick = (tsMs: number) => {
  const date = new Date(tsMs);
  date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

  const hours = date.getHours();
  const minutes = date.getMinutes();

  const withTime = hours !== 0 || minutes !== 0;

  const monthName = MONTHS_SHORT[date.getMonth()];
  return `${date.getDate()} ${monthName}${withTime ? ' ' : ''}${
    withTime
      ? `${String(date.getHours()).padStart(2, '0')}:${String(
          date.getMinutes(),
        ).padStart(2, '0')}`
      : ''
  }`;
};
