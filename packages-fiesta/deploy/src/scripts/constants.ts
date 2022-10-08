import {resolve} from 'path';
import {homedir} from 'os';

export const CONFIG_PATH =
  process.env.FIESTA_EXECUTION_CONFIG_PATH || resolve(homedir(), 'fiesta.json');
