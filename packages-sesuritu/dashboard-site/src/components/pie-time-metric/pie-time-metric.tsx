import {PieTimeMetric as PieTimeMetricType} from '@-/sesuritu-types/src/site/report/report';
import React, {FC, useCallback, useMemo} from 'react';
import {Area, AreaChart, Tooltip, XAxis, YAxis} from 'recharts';
import {timestampMsToChartTick} from '../../util/timestamp-to-chart-tick';

const COLORS = ['#d4afb9', '#d1cfe2', '#9cadce', '#7ec4cf', '#52b2cf'];

export const PieTimeMetric: FC<{metric: PieTimeMetricType}> = ({metric}) => {
  const {name, data, keys} = metric;

  const mappedData = useMemo(() => {
    return data.map((item) => {
      const {values: inputValuesMst} = item;
      const inputValues = Array.from(inputValuesMst);

      const sum = inputValues.reduce((a, b) => a + b);

      const percents = inputValues.map((value) => value / sum);
      const values = percents.slice();

      let total = 1;

      for (let i = values.length - 1; i >= 0; i--) {
        const value = values[i];
        values[i] = Math.max(0, total);
        total -= value;
      }

      return {
        ...item,
        values,
        percents,
      };
    });
  }, [data]);

  const percentsTickFormatter = useCallback((value: number) => {
    return `${Math.round(value * 1000) / 10}%`;
  }, []);

  const tooltipFormatter = useCallback(
    (
      value: number,
      key: string,
      {payload}: {payload?: {percents: number[]}},
    ): [number, string] => {
      const match = /^values\.(\d+)$/.exec(key);

      if (!match) {
        return [value, `${key} ERROR`];
      }
      if (!payload) {
        return [value, `${key} NODATA`];
      }

      const [, indexStr] = match;
      const index = parseInt(indexStr, 10);

      const dataKey = keys[index];

      return [
        percentsTickFormatter(payload.percents[index]),
        dataKey,
      ] as unknown as [number, string];
    },
    [keys],
  );

  return (
    <div>
      <div>{name}</div>
      <AreaChart
        width={600}
        height={370}
        data={mappedData}
        margin={{
          top: 5,
          right: 5,
          bottom: 5,
          left: 5,
        }}
      >
        <XAxis dataKey="tsMs" tickFormatter={timestampMsToChartTick} />
        <YAxis tickFormatter={percentsTickFormatter} />
        {keys
          .map((key, index) => {
            return (
              <Area
                key={key}
                dataKey={`values.${index}`}
                stroke="#8884d8"
                fill={COLORS[index % COLORS.length]}
                fillOpacity={1}
              />
            );
          })
          .reverse()}
        <Tooltip
          formatter={tooltipFormatter}
          labelFormatter={timestampMsToChartTick}
        />
      </AreaChart>
    </div>
  );
};
