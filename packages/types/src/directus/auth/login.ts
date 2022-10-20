import {object, string} from 'zod';
import {ZodInfer} from '../../zod/zod';

export const DirectusLoginResponse = object({
  data: object({
    access_token: string(),
    refresh_token: string(),
  }).transform(({access_token, refresh_token}) => ({
    accessToken: access_token,
    refreshToken: refresh_token,
  })),
});
export type DirectusLoginResponse = ZodInfer<typeof DirectusLoginResponse>;
