import {number, object} from 'zod';
import {ZodInfer} from '@-/types/src/zod/zod';

export const MainPageState = object({
  answer: number(),
});
export type MainPageState = ZodInfer<typeof MainPageState>;
