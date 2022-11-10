import {SimpleTimeMetric as SimpleTimeMetricType} from '@-/sesuritu-types/src/site/report/report';
import {NoSsr} from '@-/util-react/src/components/no-ssr';
import React, {FC, useCallback} from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import {Formatter} from 'recharts/types/component/DefaultTooltipContent';
import {timestampMsToChartTick} from '../../util/timestamp-to-chart-tick';

export const SimpleTimeMetric: FC<{metric: SimpleTimeMetricType}> = ({
  metric,
}) => {
  const {name, data} = metric;

  const tooltipFormatter = useCallback<Formatter<number, string>>((value) => {
    return [value, 'count'];
  }, []);

  return (
    <div>
      <div>{name}</div>
      <NoSsr>
        <LineChart
          width={600}
          height={370}
          data={data}
          margin={{top: 5, right: 5, left: 5, bottom: 5}}
        >
          <XAxis
            domain={['auto', 'auto']}
            dataKey="tsMs"
            type="number"
            xAxisId={1}
            tickFormatter={timestampMsToChartTick}
            allowDuplicatedCategory={false}
            interval="preserveStartEnd"
          />
          <YAxis dataKey="value" />
          <Tooltip
            formatter={tooltipFormatter}
            labelFormatter={timestampMsToChartTick}
          />
          <CartesianGrid stroke="#f5f5f5" />
          <Line type="monotone" dataKey="value" stroke="#387908" xAxisId={1} />
        </LineChart>
      </NoSsr>
    </div>
  );
};
