import {readFile} from 'fs/promises';
import path from 'path';
import {Context} from '../types/context';
import {
  siteRendererDependency,
  siteVersionDependency,
} from '../context/dependencies';
import {SiteRenderer} from './types';
import {SiteManifest} from '@-/fiesta-types/src/server/manifest';
import {FiestaRenderFun, RequestData} from '@-/fiesta-types/src/site/render';
import {FiestaRenderPage} from '@-/fiesta-types/src/site/pages';
import {Database} from '@-/fiesta-types/src/database/database';
import {BaseComponent} from '@-/types/src/app/component';
import {IOError} from '@-/types/src/errors/io';

class VersionNotExistsError extends Error {}

export class SiteRendererProd extends BaseComponent implements SiteRenderer {
  private database!: Database;
  private manifest: SiteManifest | undefined;
  private renderFn: FiestaRenderFun | undefined;
  private clientBuildPath: string | undefined;
  private stylesCache = new Map<string, string>();

  async init({context}: {context: Context}) {
    const {siteVersion, dependenciesGraph, database} = context;

    this.database = database;

    await dependenciesGraph.onCompleted([siteVersionDependency]);

    const version = siteVersion.getVersion();
    await this.useVersionSafe({context, version});

    dependenciesGraph.markCompleted(siteRendererDependency);

    (async () => {
      for await (const version of siteVersion.getVersionStream()) {
        this.logger.info('siteVersion:start', {version});

        let success = false;

        try {
          await this.useVersion({context, version});
          success = true;
        } catch (error) {
          this.logger.error('siteVersion', {version}, {error});
        }

        if (success) {
          this.logger.info('siteVersion:success', {version});
        }
      }
    })().catch((error) => {
      this.logger.error('versionStream', undefined, {error});
    });
  }

  private async useVersionSafe(options: {context: Context; version: string}) {
    try {
      return await this.useVersion(options);
    } catch (error) {
      if (
        options.version !== '0.0.1' &&
        error instanceof VersionNotExistsError
      ) {
        return await this.useVersion({
          ...options,
          version: '0.0.1',
        });
      }
    }
  }

  private async useVersion({
    context,
    version,
  }: {
    context: Context;
    version: string;
  }) {
    const {
      config: {buildsPath},
    } = context;

    const buildName = `site-${version}`;

    const manifestPath = path.join(
      buildsPath,
      buildName,
      'server/manifest.json',
    );

    const manifestStr = await (async () => {
      try {
        return await readFile(manifestPath, {encoding: 'utf8'});
      } catch (error) {
        const ioError = IOError.safeParse(error);
        if (ioError.success && ioError.data.code === 'ENOENT') {
          throw new VersionNotExistsError(
            `build ${buildName} does not exists, manifest path ${manifestPath}`,
          );
        }

        throw error;
      }
    })();
    const manifestJson = JSON.parse(manifestStr);

    const manifest = SiteManifest.parse(manifestJson);

    const mod = await import(
      path.join(buildsPath, buildName, 'server/server.js')
    );

    this.renderFn = mod.render as FiestaRenderFun;
    this.manifest = manifest;
    this.clientBuildPath = path.join(buildsPath, buildName, 'client');
    this.stylesCache = new Map();
  }

  render({
    page,
    request,
  }: {
    page: FiestaRenderPage;
    request: RequestData;
  }): Promise<string> {
    if (!this.manifest || !this.renderFn || !this.clientBuildPath) {
      throw new Error('SiteRenderer not initialized');
    }

    return this.renderFn({
      manifest: this.manifest[page],
      page,
      request,
      clientBuildPath: this.clientBuildPath,
      stylesCache: this.stylesCache,
      database: this.database,
    });
  }
}
