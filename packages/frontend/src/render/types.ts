import {object, string, unknown, infer as Infer} from 'zod';

export const SiteServerState = object({
  rootId: string(),
  state: unknown(),
});
export type SiteServerState = Infer<typeof SiteServerState>;
