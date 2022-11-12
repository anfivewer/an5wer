import {ReadOnlyStream} from '@-/types/src/stream/stream';
import {createStream} from '../stream/stream';

const DEBUG: boolean = false as boolean;

export class IdlingStatus {
  private runningTasksCount = 0;
  private runningStacks = DEBUG ? new Set<Error>() : undefined;
  private idleStream = createStream<boolean>();
  private tasksCountStream = createStream<number>();

  getActiveTasksCount() {
    return this.runningTasksCount;
  }

  getActiveTasksCountStream() {
    return this.tasksCountStream.getGenerator();
  }

  startTask = (meta?: unknown): (() => void) => {
    this.runningTasksCount++;
    this.tasksCountStream.replace(this.runningTasksCount);

    if (this.runningTasksCount === 1) {
      this.idleStream.replace(false);
    }

    let finished = false;

    const stack = DEBUG && new Error();
    if (DEBUG && stack && this.runningStacks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stack as any)._idlingStatusMeta = meta;
      this.runningStacks.add(stack);

      setTimeout(() => {
        if (!finished) {
          console.error('too long task', meta, stack.stack);
        }
      }, 3000);
    }

    return () => {
      if (finished) return;
      finished = true;
      this.runningTasksCount--;
      this.tasksCountStream.replace(this.runningTasksCount);

      if (DEBUG && stack && this.runningStacks) {
        this.runningStacks.delete(stack);
      }

      if (this.runningTasksCount === 0) {
        this.idleStream.replace(true);
      }
    };
  };

  wrapTask = async <T>(fun: () => T | Promise<T>): Promise<T> => {
    const finish = this.startTask();

    try {
      return await fun();
    } finally {
      finish();
    }
  };

  wrapFn<Args extends unknown[], Result>(
    fun: (...args: Args) => Result | Promise<Result>,
  ): (...args: Args) => Promise<Result> {
    return async (...args) => {
      const finish = this.startTask();

      try {
        return await fun(...args);
      } finally {
        finish();
      }
    };
  }

  isIdle = (): boolean => this.runningTasksCount === 0;

  onIdle = async (): Promise<void> => {
    if (this.isIdle()) {
      return;
    }

    for await (const isIdle of this.idleStream.getGenerator()) {
      if (isIdle) {
        return;
      }
    }
  };

  getStream(): ReadOnlyStream<boolean> {
    return this.idleStream.getGenerator();
  }

  dependsOnStream(stream: ReadOnlyStream<boolean>): () => void {
    let isDisposed = false;
    let dispose = () => {
      //
    };

    (async () => {
      let prevIdle: boolean | undefined;

      for await (const idle of stream) {
        if (isDisposed) {
          return;
        }

        if (prevIdle === idle) {
          continue;
        }

        if (!idle) {
          dispose = this.startTask();
        } else {
          dispose();
        }

        prevIdle = idle;
      }
    })();

    return () => {
      isDisposed = true;
      dispose();
    };
  }

  _debugPrintStacks() {
    if (!this.runningStacks) {
      throw new Error('not in a debug mode');
    }

    console.log('---');
    for (const error of this.runningStacks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMeta = (error as any)._idlingStatusMeta;
      console.log(errorMeta, error.stack);
    }
    console.log('---');
  }
}
