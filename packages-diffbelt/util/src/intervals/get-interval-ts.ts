import {AggregateInterval} from '../transform/types';

export const getIntervalTsMs = ({
  interval,
  timestampMs,
}: {
  interval: AggregateInterval;
  timestampMs: number;
}): number => {
  switch (interval) {
    case AggregateInterval.WEEK:
    case AggregateInterval.MONTH:
      throw new Error('week/month intervals are not implemented yet');
  }

  return timestampMs - (timestampMs % (interval * 1000));
};
