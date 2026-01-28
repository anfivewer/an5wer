import {string, ZodInfer} from '../zod';

export const UtcDay = string().brand('UtcDay');
export type UtcDay = ZodInfer<typeof UtcDay>;
