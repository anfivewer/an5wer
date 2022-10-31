import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {HttpServer} from '@-/util/src/http-server/http-server';
import {Logger} from '@-/types/src/logging/logging';
import {Sessions} from '../sessions/sessions';
import {Config} from '../types/config';
import {Context} from '../types/context';

const notFilled = Symbol('notFilled');

type NotFilledContext = {
  [Key in keyof Context]: Context[Key] | typeof notFilled;
};

export const createContext = ({
  config,
  logger,
}: {
  config: Config;
  logger: Logger;
}): Context => {
  let isInitialized = false;
  const initTasks: (() => Promise<void>)[] = [];

  const context: NotFilledContext = {
    mainLogger: logger,
    config,
    httpServer: notFilled,
    dependenciesGraph: new DependenciesGraph(),
    sessions: new Sessions({logger: logger.fork('sessions')}),
    getUnixTimeSeconds: () => Math.floor(Date.now() / 1000),
    registerOnInit: (fn) => {
      if (isInitialized) {
        throw new Error('Already initialized');
      }

      initTasks.push(fn);
    },
    init: notFilled,
  };

  const unsafeContext = context as Context;

  context.httpServer = new HttpServer({logger: logger.fork('http')});

  context.init = async () => {
    if (isInitialized) {
      throw new Error('Second-time initialization');
    }

    isInitialized = true;

    await Promise.all([
      ...initTasks.map((task) => task()),
      unsafeContext.sessions.init({context: unsafeContext}),
    ]);
    initTasks.splice(0, initTasks.length);
  };

  // Validate that we are not forgot some field
  for (const [key, value] of Object.entries(context)) {
    if (value === notFilled) {
      throw new Error(`Config key '${key}' not filled`);
    }
  }

  return unsafeContext;
};
