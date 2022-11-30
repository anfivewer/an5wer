import {zodEnum, ZodInfer} from '@-/types/src/zod/zod';
import {array, literal, number, object, string, union} from 'zod';

export const ReportTypeEnum = zodEnum([
  'simpleTimeMetric',
  'pieTimeMetric',
  'percentileMetric',
]);
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

export const PieTimeMetricDataItem = object({
  tsMs: number(),
  values: array(number()),
});
export type PieTimeMetricDataItem = ZodInfer<typeof PieTimeMetricDataItem>;

export const PieTimeMetric = object({
  type: literal(ReportType.pieTimeMetric),
  name: string(),
  keys: array(string()),
  data: array(PieTimeMetricDataItem),
});
export type PieTimeMetric = ZodInfer<typeof PieTimeMetric>;

export const PercentileMetricDataItem = object({
  tsMs: number(),
  count: number(),
  values: array(number()),
});
export type PercentileMetricDataItem = ZodInfer<
  typeof PercentileMetricDataItem
>;

export const PercentileMetric = object({
  type: literal(ReportType.percentileMetric),
  name: string(),
  percentiles: array(number()),
  data: array(PercentileMetricDataItem),
});
export type PercentileMetric = ZodInfer<typeof PercentileMetric>;

export const ReportData = object({
  reports: array(union([SimpleTimeMetric, PieTimeMetric, PercentileMetric])),
});
export type ReportData = ZodInfer<typeof ReportData>;

export const ObjA = object({type: literal('a')});
export const ObjB = object({type: literal('b')});

export const UnionExample = union([ObjA, ObjB]);
