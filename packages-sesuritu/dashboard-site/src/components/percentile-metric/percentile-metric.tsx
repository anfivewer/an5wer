import {PercentileMetric as PercentileMetricType} from '@-/sesuritu-types/src/site/report/report';
import {NoSsr} from '@-/util-react/src/components/no-ssr';
import React, {FC, useCallback, useMemo} from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import {Formatter} from 'recharts/types/component/DefaultTooltipContent';
import {timestampMsToChartTick} from '../../util/timestamp-to-chart-tick';

export const PercentileMetric: FC<{metric: PercentileMetricType}> = ({
  metric,
}) => {
  const {name, percentiles, data: dataRaw} = metric;

  const percentileColors = useMemo(() => {
    return percentiles.map((n) => {
      return `hsl(${100 - n}deg 71% 48% / 50%)`;
    });
  }, [percentiles]);

  const data = useMemo(() => {
    return dataRaw.map((d) => ({
      ...d,
      values: d.values.map((n) => (n === 0 ? 1 : n)),
    }));
  }, [dataRaw]);

  const tooltipFormatter = useCallback<Formatter<number, string>>(
    (value, field) => {
      if (field === 'count') {
        return [value, 'count'];
      }

      const match = /^values\.(\d+)$/.exec(field);
      if (!match) {
        return [value, '???'];
      }

      return [value, `p${percentiles[parseInt(match[1], 10)]}`];
    },
    [],
  );

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
            xAxisId={0}
            tickFormatter={timestampMsToChartTick}
            allowDuplicatedCategory={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId={0}
            orientation="left"
            domain={['auto', 'auto']}
            scale="log"
          />
          <YAxis yAxisId={1} orientation="right" />
          <Tooltip
            formatter={tooltipFormatter}
            labelFormatter={timestampMsToChartTick}
          />
          <CartesianGrid stroke="#f5f5f5" />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#9cadce"
            xAxisId={0}
            yAxisId={1}
            dot={false}
          />
          {percentiles.map((p, index) => {
            return (
              <Line
                key={p}
                type="monotone"
                dataKey={`values.${index}`}
                stroke={percentileColors[index]}
                xAxisId={0}
                yAxisId={0}
                dot={false}
              />
            );
          })}
        </LineChart>
      </NoSsr>
    </div>
  );
};
