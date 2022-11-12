import {Defer} from './defer';

export class SingletonAsyncTask {
  private isRunning = false;
  private scheduledTask: (() => Promise<void>) | null = null;
  private scheduledDefers: Defer[] = [];

  hasScheduledTask() {
    return Boolean(this.scheduledTask);
  }

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
    this.scheduledTask = task;

    const scheduledDefer = new Defer();
    this.scheduledDefers.push(scheduledDefer);

    (async () => {
      await Promise.resolve();
      this.onTaskFinished();
    })();

    return scheduledDefer.promise;
  }
}
