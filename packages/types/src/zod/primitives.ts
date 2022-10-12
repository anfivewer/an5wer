import {array, string} from 'zod';
import {ZodInfer} from './zod';

export const ArrayOfStrings = array(string());
export type ArrayOfStrings = ZodInfer<typeof ArrayOfStrings>;
