import {zodEnum, ZodInfer} from '@-/types/src/zod/zod';
import {array, literal, number, object, string} from 'zod';

export const ReportTypeEnum = zodEnum(['simpleTimeMetric']);
export const ReportType = ReportTypeEnum.enum;
export type ReportType = ZodInfer<typeof ReportTypeEnum>;

export const SimpleTimeMetricDataItem = object({
  tsMs: number(),
  value: number(),
});
export type SimpleTimeMetricDataItem = ZodInfer<
  typeof SimpleTimeMetricDataItem
>;

export const SimpleTimeMetric = object({
  type: literal(ReportType.simpleTimeMetric),
  name: string(),
  data: array(SimpleTimeMetricDataItem),
});
export type SimpleTimeMetric = ZodInfer<typeof SimpleTimeMetric>;

export const ReportData = object({
  reports: array(SimpleTimeMetric),
});
export type ReportData = ZodInfer<typeof ReportData>;
