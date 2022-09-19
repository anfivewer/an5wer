import {Logger} from '../logging/logging';

export class BaseComponent {
  protected logger: Logger;

  constructor({logger}: {logger: Logger}) {
    this.logger = logger;
  }
}

export type InitableComponent<T, C> = T & {
  init: (options: {context: C}) => Promise<void>;
};

export type GetComponentFn<T, C> = (options: {
  logger: Logger;
}) => InitableComponent<T, C>;
