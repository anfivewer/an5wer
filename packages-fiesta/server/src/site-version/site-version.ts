import {readFile, writeFile} from 'fs/promises';
import {Context} from '../types/context';
import {object, string} from 'zod';
import {Logger} from '@-/util/src/logging/types';
import {SingletonAsyncTask} from '@-/util/src/async/singleton';
import {siteVersionDependency} from '../context/dependencies';

const versionSchema = object({
  version: string(),
});

export class SiteVersion {
  private version!: string;
  private siteVersionPath!: string;
  private logger: Logger;
  private singleton = new SingletonAsyncTask();

  constructor({logger}: {logger: Logger}) {
    this.logger = logger;
  }

  async init({context}: {context: Context}) {
    const {
      config: {siteVersionPath},
      dependenciesGraph,
    } = context;

    this.siteVersionPath = siteVersionPath;

    const data = await (async () => {
      let content: string;

      try {
        content = await readFile(siteVersionPath, {encoding: 'utf8'});
      } catch (error) {
        const data = {version: '0.0.1'};
        content = JSON.stringify(data);

        await writeFile(siteVersionPath, content, {encoding: 'utf8'});

        return data;
      }

      const json = JSON.parse(content);
      return versionSchema.parse(json);
    })();

    this.version = data.version;

    dependenciesGraph.markCompleted(siteVersionDependency);
  }

  getVersion(): string {
    return this.version;
  }

  setVersion(version: string): void {
    this.version = version;

    this.singleton
      .schedule(async () => {
        await writeFile(this.siteVersionPath, JSON.stringify({version}), {
          encoding: 'utf8',
        });
      })
      .catch((error) => {
        this.logger.error('set', undefined, {error});
      });
  }
}
