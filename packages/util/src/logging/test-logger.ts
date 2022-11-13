import {LogFnOptions, LogFnProps, Logger} from '@-/types/src/logging/logging';
import {noop} from '../fn/noop';

type LogData = {
  key: string;
  props: LogFnProps | undefined;
  options: LogFnOptions | undefined;
};

export class TestLogger {
  private warnings: LogData[] = [];
  private errors: LogData[] = [];

  private logger: Logger = {
    trace: noop,
    info: noop,
    warning: (key, props, options) => {
      this.warnings.push({key, props, options});
    },
    error: (key, props, options) => {
      this.errors.push({key, props, options});
    },
    stats: noop,
    fork: () => this.logger,
  };

  getLogger() {
    return this.logger;
  }

  getWarnings() {
    return this.warnings;
  }

  getErrors() {
    return this.errors;
  }

  hasErrorsOrWarnings() {
    return Boolean(this.warnings.length || this.errors.length);
  }
}
