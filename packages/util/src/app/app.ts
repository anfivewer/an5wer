import {Logger as LoggerInterface} from '@-/types/src/logging/logging';
import {Component} from '@-/types/src/app/component';
import {
  AppOptions,
  RegisterComponentOptions,
  App as AppInterface,
  InitTaskFn,
} from '@-/types/src/app/app';
import {
  NonInitializedContext,
  notInitializedContextValue,
} from '@-/types/src/app/context';
import {Defer} from '../async/defer';

class App<Logger extends LoggerInterface, Config, Context>
  implements AppInterface<Context>
{
  private config: Config;
  private logger: LoggerInterface;
  private nonInitializedContext: NonInitializedContext<Context>;
  private context: Context | undefined;
  private components: {
    name: keyof Context;
    component: Component<Context>;
    afterInit: InitTaskFn<Context> | undefined;
  }[] = [];
  private isInitialized = false;
  private initTasks: {
    name: string;
    task: InitTaskFn<Context>;
  }[] = [];
  private preInit: AppOptions<Logger, Config, Context>['preInit'];

  constructor({
    logger,
    context,
    config,
    preInit,
  }: {
    logger: LoggerInterface;
    context: NonInitializedContext<Context>;
    config: Config;
    preInit: AppOptions<Logger, Config, Context>['preInit'];
  }) {
    this.logger = logger;
    this.nonInitializedContext = context;
    this.config = config;
    this.preInit = preInit;
  }

  registerComponent({
    name,
    getComponent,
    loggerKey,
    afterInit,
  }: RegisterComponentOptions<Context>) {
    const component = getComponent({
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      logger: this.logger.fork(loggerKey || String(name)),
    });
    this.nonInitializedContext[name] = component;

    this.components.push({name, component, afterInit});
  }

  registerOnInit(
    task: (options: {context: Context}) => Promise<void>,
    {name}: {name?: string} = {},
  ) {
    if (this.isInitialized) {
      throw new Error('already initialized');
    }

    this.initTasks.push({
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      name: name || `onInit:${task.name}:${this.initTasks.length}`,
      task,
    });
  }

  getContext() {
    return this.context;
  }

  async init(): Promise<Context> {
    this.logger.info('helloWorld');

    await this.preInit?.({
      app: this,
      logger: this.logger.fork('preInit'),
      config: this.config,
    });

    this.context = await this._init();
    return this.context;
  }

  private async _init(): Promise<Context> {
    const {logger} = this;

    if (this.isInitialized) {
      throw new Error('Second-time initialization');
    }

    this.isInitialized = true;

    // Validate that we are not forgot to register some components
    for (const [key, value] of Object.entries(this.nonInitializedContext)) {
      if (value === notInitializedContextValue) {
        throw new Error(`Context field '${key}' not filled`);
      }
    }

    const context = this.nonInitializedContext as Context;

    await Promise.all([
      ...this.initTasks.map(async ({name, task}) => {
        logger.info('init:start', {taskName: String(name)});
        await task({context});
        logger.info('init:finish', {taskName: String(name)});
      }),
      ...this.components.map(async ({name, component, afterInit}) => {
        logger.info('init:start', {componentName: String(name)});
        await component.init({context});
        logger.info('init:finish', {componentName: String(name)});

        if (afterInit) {
          logger.info('init:start:after', {componentName: String(name)});
          await afterInit({context});
          logger.info('init:finish:after', {componentName: String(name)});
        }
      }),
    ]);
    this.initTasks.splice(0, this.initTasks.length);

    return context;
  }

  private stopDefer: Defer | undefined;
  async stop({
    withTimeout = true,
    timeoutMs = 3000,
    printHandlesOnTimeout = false,
  }: {
    withTimeout?: boolean;
    timeoutMs?: number;
    printHandlesOnTimeout?: boolean;
  } = {}): Promise<void> {
    if (this.stopDefer) {
      return this.stopDefer.promise;
    }

    this.stopDefer = new Defer();

    try {
      const {logger} = this;

      logger.info('shutdown:start');

      const timeoutDefer = new Defer<void>();

      const timeoutId = setTimeout(() => {
        if (!withTimeout) {
          return;
        }

        logger.error('shutdown:timeout');

        if (printHandlesOnTimeout) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const requests = (process as any)._getActiveRequests();
            console.error(requests);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handles = (process as any)._getActiveHandles();
            console.error(handles);
          } catch (error) {
            logger.error('shutdown:handles', undefined, {error});
          }
        }

        timeoutDefer.reject(new Error('shutdown:timeout'));
      }, timeoutMs);

      const shutdownPromises: Promise<void>[] = [];

      this.components.forEach(({name, component}) => {
        if (component.stop) {
          const stop = component.stop.bind(component);
          shutdownPromises.push(
            stop().catch((error) => {
              logger.error('shutdown', {componentName: String(name)}, {error});
            }),
          );
        }
      });

      await Promise.race([Promise.all(shutdownPromises), timeoutDefer.promise]);

      clearTimeout(timeoutId);
    } catch (error) {
      this.stopDefer.reject(error);
      throw error;
    }

    this.stopDefer.resolve();
  }
}

export const createApp = async <
  Logger extends LoggerInterface,
  Config,
  Context,
>({
  getLogger,
  getConfig,
  setupLoggerByConfig,
  getInitialContext,
  preInit,
}: AppOptions<Logger, Config, Context>): Promise<AppInterface<Context>> => {
  const logger = getLogger();
  const config = await getConfig({logger: logger.fork('config')});

  setupLoggerByConfig?.({config, logger});

  const context = getInitialContext({config, logger});

  return new App({logger, context, config, preInit});
};
