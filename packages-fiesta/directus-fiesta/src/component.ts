import {Component} from '@-/types/src/app/component';
import {DirectusStartOptions, startDirectus} from './start';

export type DirectusComponentOptions<T> = DirectusStartOptions & {
  onInit?: (options: {context: T}) => Promise<void>;
};

export class DirectusComponent<T> implements Component<T> {
  private startOptions: DirectusStartOptions;
  private runningDirectusPromise: Promise<void> = Promise.resolve();
  private shutdown: () => Promise<void> = () => Promise.resolve();
  private onInit?: DirectusComponentOptions<T>['onInit'];

  constructor({onInit, ...startOptions}: DirectusComponentOptions<T>) {
    this.startOptions = startOptions;
    this.onInit = onInit;
  }

  async init({context}: {context: T}): Promise<void> {
    const {runningDirectusPromise, shutdown} = await startDirectus(
      this.startOptions,
    );

    await this.onInit?.({context});

    this.runningDirectusPromise = runningDirectusPromise;
    this.shutdown = shutdown;
  }

  getRunningDirectusPromise() {
    return this.runningDirectusPromise;
  }

  async stop(): Promise<void> {
    await this.shutdown();
    await this.runningDirectusPromise;
  }
}
