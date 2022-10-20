import {array, literal, object, union} from 'zod';

export const DirectusItemsErrorResponse = object({
  errors: array(
    object({
      extensions: union([
        object({code: literal('RECORD_NOT_UNIQUE')}),
        object({code: literal('FORBIDDEN')}),
      ]),
    }),
  ),
});
