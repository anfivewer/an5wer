import {DependenciesGraph} from '@-/util/src/async/dependencies-graph';
import {HttpServer} from '@-/util/src/http-server/http-server';
import {Logger} from '@-/util/src/logging/types';
import {SiteVersion} from '../site-version/site-version';
import {SiteRendererProd} from '../site/renderer';
import {SiteRenderer} from '../site/types';
import {Config} from '../types/config';
import {Context} from '../types/context';

const notFilled = Symbol('notFilled');

type NotFilledContext = {
  [Key in keyof Context]: Context[Key] | typeof notFilled;
};

export const createContext = ({
  config,
  logger,
  getSiteRenderer = () => new SiteRendererProd(),
}: {
  config: Config;
  logger: Logger;
  getSiteRenderer?: () => SiteRenderer;
}): Context => {
  let isInitialized = false;
  const initTasks: (() => Promise<void>)[] = [];

  const context: NotFilledContext = {
    mainLogger: logger,
    config,
    httpServer: notFilled,
    siteVersion: notFilled,
    dependenciesGraph: new DependenciesGraph(),
    siteRenderer: notFilled,
    registerOnInit: (fn) => {
      if (isInitialized) {
        throw new Error('Already initialized');
      }

      initTasks.push(fn);
    },
    init: notFilled,
  };

  const unsafeContext = context as Context;

  const siteVersion = new SiteVersion({logger: logger.fork('site-ver')});
  context.siteVersion = siteVersion;

  const siteRenderer = getSiteRenderer();
  context.siteRenderer = siteRenderer;

  context.httpServer = new HttpServer();

  context.init = async () => {
    if (isInitialized) {
      throw new Error('Second-time initialization');
    }

    isInitialized = true;

    await Promise.all([
      ...initTasks.map((task) => task()),
      siteVersion.init({context: unsafeContext}),
      siteRenderer.init({context: unsafeContext}),
    ]);
    initTasks.splice(0, initTasks.length);
  };

  // Validate that we are not forgot some field
  for (const [key, value] of Object.entries(context)) {
    if (value === notFilled) {
      throw new Error(`Config ${key} not filled`);
    }
  }

  return unsafeContext;
};
