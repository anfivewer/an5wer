import {number, object} from 'zod';
import {ZodInfer} from '@-/types/src/zod/zod';
import {ReportData} from '../report/report';

export const MainPageState = object({
  answer: number(),
  report: ReportData.optional(),
});
export type MainPageState = ZodInfer<typeof MainPageState>;
