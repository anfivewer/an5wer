import {IdlingStatus} from '../state/idling-status';
import {Defer} from './defer';

type HandleFn<T> = (items: T[]) => Promise<void>;
type HandleErrorFn = (error: unknown) => void;

const defaultHandleError: HandleErrorFn = (error) => console.error(error);

export type BatchOptions<T> = {
  maxItems: number;
  delayMs: number;
  handle: HandleFn<T>;
  handleError: HandleErrorFn | undefined;
};

export class AsyncBatcher<T> {
  private maxItems: number;
  private delayMs: number;
  private handle: HandleFn<T>;
  private handleError: HandleErrorFn;
  private timeoutId: ReturnType<typeof setTimeout> | 0 = 0;
  private batchExecutionDefer = new Defer();
  private isRunning = false;
  private items: T[] = [];
  private idlingDefer: Defer | undefined;
  private batchWaitersCount = new IdlingStatus();

  constructor({
    maxItems,
    delayMs,
    handle,
    handleError = defaultHandleError,
  }: BatchOptions<T>) {
    this.maxItems = maxItems;
    this.delayMs = delayMs;
    this.handle = handle;
    this.handleError = handleError;

    this.batchExecutionDefer.resolve();
  }

  batch = async (item: T): Promise<void> => {
    if (!this.idlingDefer) {
      this.idlingDefer = new Defer();
    }

    // Block next batch collection while previous is handled
    // TODO: actually we can still collect next portion
    await this.batchWaitersCount.wrapTask(
      () => this.batchExecutionDefer.promise,
    );

    this.items.push(item);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    if (this.items.length >= this.maxItems) {
      await this.doHandle();
      return;
    }

    this.timeoutId = setTimeout(() => {
      this.timeoutId = 0;

      if (!this.items.length) {
        return;
      }

      this.doHandle();
    }, this.delayMs);
  };

  onIdle(): Promise<void> {
    if (!this.idlingDefer) {
      return Promise.resolve();
    }

    return this.idlingDefer.promise;
  }

  private doHandle = async (): Promise<void> => {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    const defer = new Defer();
    this.batchExecutionDefer = defer;

    while (true) {
      const batchItems = this.items.splice(0, this.maxItems);

      if (!batchItems.length) {
        break;
      }

      try {
        await this.handle(batchItems);
      } catch (error) {
        this.handleError(error);
      }
    }

    if (!this.batchWaitersCount.getActiveTasksCount() && this.idlingDefer) {
      this.idlingDefer.resolve();
      this.idlingDefer = undefined;
    }

    this.isRunning = false;
    defer.resolve();
  };
}
