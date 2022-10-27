import {ReadOnlyStream} from '@-/types/src/stream/stream';
import {createStream} from '../stream/stream';

const DEBUG: boolean = false as boolean;

export class IdlingStatus {
  private runningTasksCount = 0;
  private runningStacks = DEBUG ? new Set<Error>() : undefined;
  private idleStream = createStream<boolean>();

  getActiveTasksCount() {
    return this.runningTasksCount;
  }

  startTask = (): (() => void) => {
    this.runningTasksCount++;

    const stack = DEBUG && new Error();
    if (DEBUG && stack && this.runningStacks) {
      this.runningStacks.add(stack);
    }

    if (this.runningTasksCount === 1) {
      this.idleStream.replace(false);
    }

    let finished = false;

    return () => {
      if (finished) return;
      finished = true;
      this.runningTasksCount--;

      if (DEBUG && stack && this.runningStacks) {
        this.runningStacks.delete(stack);
        if (this.runningTasksCount === 0) {
          console.log(stack);

          for (const error of this.runningStacks) {
            console.error(error.stack);
          }
        }
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

        if (idle) {
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
}
