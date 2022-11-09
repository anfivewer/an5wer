import {SimpleTimeMetric as SimpleTimeMetricType} from '@-/sesuritu-types/src/site/report/report';
import React, {FC, useCallback} from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import {Formatter} from 'recharts/types/component/DefaultTooltipContent';

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

export const SimpleTimeMetric: FC<{metric: SimpleTimeMetricType}> = ({
  metric,
}) => {
  const {name, data} = metric;

  const tickFormatter = useCallback((tsMs: number) => {
    const date = new Date(tsMs);
    date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

    const monthName = MONTHS_SHORT[date.getMonth()];
    return `${date.getDate()} ${monthName} ${String(date.getHours()).padStart(
      2,
      '0',
    )}:${String(date.getMinutes()).padStart(2, '0')}`;
  }, []);

  const tooltipFormatter = useCallback<Formatter<number, string>>(
    (value, name, props) => {
      console.log(value, name, props);
      return [value, 'count'];
    },
    [],
  );

  const labelFormatter = useCallback(
    (label: number) => {
      return tickFormatter(label);
    },
    [tickFormatter],
  );

  return (
    <div>
      <div>{name}</div>
      <LineChart
        width={600}
        height={400}
        data={data}
        margin={{top: 5, right: 20, left: 10, bottom: 5}}
      >
        <XAxis
          domain={['auto', 'auto']}
          dataKey="tsMs"
          type="number"
          xAxisId={1}
          tickFormatter={tickFormatter}
          allowDuplicatedCategory={false}
          interval="preserveStartEnd"
        />
        <YAxis dataKey="value" />
        <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
        <CartesianGrid stroke="#f5f5f5" />
        <Line type="monotone" dataKey="value" stroke="#387908" xAxisId={1} />
      </LineChart>
    </div>
  );
};
