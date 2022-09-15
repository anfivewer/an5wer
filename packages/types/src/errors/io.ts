import {literal, object} from 'zod';

export const IOError = object({
  code: literal('ENOENT'),
});
