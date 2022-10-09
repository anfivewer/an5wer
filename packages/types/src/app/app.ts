import {Logger as LoggerInterface} from '../logging/logging';
import {GetComponentFn} from './component';
import {NonInitializedContext} from './context';

export type GetInitialContextFn<Config, Context> = (options: {
  config: Config;
  logger: LoggerInterface;
}) => NonInitializedContext<Context>;

export type AppOptions<Logger extends LoggerInterface, Config, Context> = {
  getLogger: () => Logger;
  getConfig: (options: {logger: LoggerInterface}) => Promise<Config>;
  setupLoggerByConfig?: (options: {config: Config; logger: Logger}) => void;
  getInitialContext: GetInitialContextFn<Config, Context>;
  preInit?: (options: {
    logger: LoggerInterface;
    config: Config;
  }) => Promise<void>;
};

export type InitTaskFn<Context> = (options: {
  context: Context;
}) => Promise<void>;

export type RegisterComponentOptions<Context> = {
  loggerKey?: string;
  afterInit?: InitTaskFn<Context>;
} & {
  [Key in keyof Context]: {
    name: Key;
    getComponent: GetComponentFn<Context[Key], Context>;
  };
}[keyof Context];

export type App<Context> = {
  registerComponent: (options: RegisterComponentOptions<Context>) => void;
  registerOnInit: (
    task: InitTaskFn<Context>,
    options?: {name?: string},
  ) => void;
  init: () => Promise<Context>;
  getContext: () => Context | undefined;
  stop: (options?: {
    timeoutMs?: number;
    printHandlesOnTimeout?: boolean;
  }) => Promise<void>;
};
