import {Logger} from '@-/types/src/logging/logging';

export const createGetConfig = <T>(
  fun: (options: {
    logger: Logger;
    getBoolean: (name: string, defaultValue?: boolean) => boolean;
    getInteger: (name: string) => number;
    getNonEmptyString: (name: string) => string;
  }) => Promise<T>,
): ((options: {logger: Logger}) => Promise<T>) => {
  return async ({logger}) => {
    let error: Error | undefined;

    const getBoolean = (name: string, defaultValue?: boolean): boolean => {
      const value = process.env[name];
      if (!value) {
        if (typeof defaultValue === 'boolean') {
          return defaultValue;
        }

        error = new Error(`process.env.${name} should be present`);
        logger.error('noValue', {name}, {error});
        return false;
      }

      const isValid = ['0', '1'].includes(value);
      if (!isValid) {
        error = new Error(
          `process.env.${name} is invalid: ${value}, should be 0 or 1`,
        );
        logger.error('notBoolean', {name, value}, {error});
        return false;
      }

      return value === '1';
    };

    const getInteger = (name: string): number => {
      const value = process.env[name];
      if (!value) {
        error = new Error(`process.env.${name} should be present`);
        logger.error('noValue', {name}, {error});
        return 0;
      }

      const num = parseInt(value, 10);
      if (!isFinite(num)) {
        error = new Error(`process.env.${name} is invalid integer: ${value}`);
        logger.error('notFinite', {name, value}, {error});
        return 0;
      }

      return num;
    };

    const getNonEmptyString = (name: string): string => {
      const value = process.env[name];
      if (!value) {
        error = new Error(`process.env.${name} should be present`);
        logger.error('noValue', {name}, {error});
        return '';
      }

      return value;
    };

    const config = await fun({
      logger,
      getBoolean,
      getInteger,
      getNonEmptyString,
    });

    return config;
  };
};
