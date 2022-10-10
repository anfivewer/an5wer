import {Logger} from '../logging/logging';

export class BaseComponent {
  protected logger: Logger;

  constructor({logger}: {logger: Logger}) {
    this.logger = logger;
  }
}

export type InitableComponent<C> = {
  init: (options: {context: C}) => Promise<void>;
};

export type StoppableComponent = {
  stop: () => Promise<void>;
};

export type MaybeStoppableComponent = {
  stop?: () => Promise<void>;
};

export type Component<C> = InitableComponent<C> & MaybeStoppableComponent;

export type GetComponentFn<T, C> = (options: {
  logger: Logger;
}) => T & Component<C>;
