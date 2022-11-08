import {IdlingStatus} from '../state/idling-status';

export class Parallel {
  private concurrency: number;
  private runningTasks = new IdlingStatus();

  constructor({concurrency = 16}: {concurrency?: number} = {}) {
    this.concurrency = concurrency;
  }

  async schedule<T>(fun: () => Promise<T>): Promise<T> {
    const stream = this.runningTasks.getActiveTasksCountStream();

    while (this.runningTasks.getActiveTasksCount() >= this.concurrency) {
      await stream.next();
    }

    return await this.runningTasks.wrapTask(fun);
  }

  async onSlotsAvailable(): Promise<void> {
    const stream = this.runningTasks.getActiveTasksCountStream();

    while (this.runningTasks.getActiveTasksCount() >= this.concurrency) {
      const iteratorResult = await stream.next();
      if (iteratorResult.done) {
        throw new Error('impossible');
      }

      const count = iteratorResult.value;
      if (count < this.concurrency) {
        break;
      }
    }
  }

  async onEmpty(): Promise<void> {
    const stream = this.runningTasks.getActiveTasksCountStream();

    while (this.runningTasks.getActiveTasksCount() !== 0) {
      const iteratorResult = await stream.next();
      if (iteratorResult.done) {
        throw new Error('impossible');
      }

      const count = iteratorResult.value;
      if (count === 0) {
        break;
      }
    }
  }
}
