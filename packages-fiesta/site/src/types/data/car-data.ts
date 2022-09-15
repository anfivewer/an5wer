import {MileageTimeEvent} from './car-events';

export type CarData = {
  events: MileageTimeEvent[];
  scheduledService: MileageTimeEvent[];
};
