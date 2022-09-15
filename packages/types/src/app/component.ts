import {Logger} from '../logging/logging';

export class BaseComponent {
  protected logger: Logger;

  constructor({logger}: {logger: Logger}) {
    this.logger = logger;
  }
}
