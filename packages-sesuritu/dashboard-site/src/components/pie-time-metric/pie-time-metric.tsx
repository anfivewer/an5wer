import {PieTimeMetric as PieTimeMetricType} from '@-/sesuritu-types/src/site/report/report';
import React, {FC, useCallback, useMemo} from 'react';
import {Area, AreaChart, Tooltip, XAxis, YAxis} from 'recharts';
import {timestampMsToChartTick} from '../../util/timestamp-to-chart-tick';
import {NoSsr} from '@-/util-react/src/components/no-ssr';

const COLORS = ['#d4afb9', '#d1cfe2', '#9cadce', '#7ec4cf', '#52b2cf'];

export const PieTimeMetric: FC<{metric: PieTimeMetricType}> = ({metric}) => {
  const {name, data, keys} = metric;

  const {keys: mappedKeys, data: mappedData} = useMemo(() => {
    const keysTotal = keys.map(() => 0);

    data.forEach(({values}) => {
      values.forEach((value, i) => {
        keysTotal[i] += value;
      });
    });

    const keysTotalSum = keysTotal.reduce((a, b) => a + b, 0);
    let tailSum = 0;
    let tailIndex = keys.length - 1;
    let withFakeTail = false;

    for (; tailIndex >= 0; tailIndex--) {
      const value = keysTotal[tailIndex];
      tailSum += value;

      if (tailSum / keysTotalSum >= 0.01) {
        withFakeTail = true;
        tailIndex++;
        tailSum -= value;
        break;
      }
    }

    withFakeTail = withFakeTail && tailIndex < keys.length - 1;

    const fakeTailKeys = (() => {
      if (!withFakeTail) {
        tailIndex++;
        return [];
      }

      return ['<1%'];
    })();

    return {
      keys: keys.slice(0, tailIndex).concat(fakeTailKeys),
      data: data.map((item) => {
        const {values: inputValuesMst} = item;
        const inputValues = inputValuesMst.slice(0, tailIndex);

        if (withFakeTail) {
          inputValues.push(
            inputValuesMst.slice(tailIndex).reduce((a, b) => a + b, 0),
          );
        }

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
      }),
    };
  }, [keys, data]);

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

      const dataKey = mappedKeys[index];

      return [
        percentsTickFormatter(payload.percents[index]),
        dataKey,
      ] as unknown as [number, string];
    },
    [mappedKeys],
  );

  return (
    <div>
      <div>{name}</div>
      <NoSsr>
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
      </NoSsr>
    </div>
  );
};
