import {Context} from '../types/context';
import {Logger} from '@-/util/src/logging/types';
import {ReadOnlyStream} from '@-/types/src/stream/stream';
import {
  databaseDependency,
  siteVersionDependency,
} from '../context/dependencies';
import {Database} from '@-/fiesta-types/src/database/database';
import {createStream} from '@-/util/src/stream/stream';

export class SiteVersion {
  private version!: string;
  private database!: Database;
  private logger: Logger;
  private versionStream = createStream<string>();

  constructor({logger}: {logger: Logger}) {
    this.logger = logger;
  }

  async init({context}: {context: Context}) {
    const {dependenciesGraph, database} = context;

    this.database = database;

    await dependenciesGraph.onCompleted([databaseDependency]);

    await this.readVersion();

    dependenciesGraph.markCompleted(siteVersionDependency);
  }

  getVersion(): string {
    return this.version;
  }

  getVersionStream(): ReadOnlyStream<string> {
    return this.versionStream.getGenerator();
  }

  private async readVersion() {
    const version = await this.database.getSiteVersion();
    if (version === this.version) {
      return;
    }

    this.version = version;
    this.versionStream.replace(version);
  }

  onVersionUpdated(): void {
    this.readVersion().catch((error) => {
      this.logger.error('readVersion', undefined, {error});
    });
  }
}
