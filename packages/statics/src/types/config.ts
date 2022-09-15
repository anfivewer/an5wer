export type Config = {
  isDev: boolean;
  isDebug: boolean;
  dataPath: string;
  sessionsPath: string;
  httpPort: number;
  privateStaticsUrlPrefix: string;
};