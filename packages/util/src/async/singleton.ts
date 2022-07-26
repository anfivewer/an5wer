import {Defer} from './defer';

export class SingletonAsyncTask {
  private isRunning = false;
  private scheduledTask: (() => Promise<void>) | null = null;
  private scheduledDefers: Defer[] = [];

  private run(task: () => Promise<void>): Promise<void> {
    this.isRunning = true;

    return task().finally(this.onTaskFinished.bind(this));
  }

  private onTaskFinished() {
    const scheduledTask = this.scheduledTask;
    if (!scheduledTask) {
      this.isRunning = false;
      return;
    }

    const defers = this.scheduledDefers;
    this.scheduledDefers = [];
    this.scheduledTask = null;

    this.run(() =>
      scheduledTask().then(
        () => {
          defers.forEach((defer) => {
            defer.resolve();
          });
        },
        (error) => {
          defers.forEach((defer) => {
            defer.reject(error);
          });
        },
      ),
    );
  }

  schedule(task: () => Promise<void>): Promise<void> {
    if (!this.isRunning) {
      return this.run(task);
    }

    const scheduledDefer = new Defer();
    this.scheduledDefers.push(scheduledDefer);

    this.scheduledTask = task;

    return scheduledDefer.promise;
  }
}
