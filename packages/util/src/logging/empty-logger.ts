import {Logger} from '@-/types/src/logging/logging';
import {noop} from '../fn/noop';

export const EMPTY_LOGGER: Logger = {
  trace: noop,
  info: noop,
  warning: noop,
  error: noop,
  stats: noop,
  fork: () => EMPTY_LOGGER,
};
