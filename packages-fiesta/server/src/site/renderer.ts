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

export class SiteRendererProd extends BaseComponent implements SiteRenderer {
  private database!: Database;
  private manifest: SiteManifest | undefined;
  private renderFn: FiestaRenderFun | undefined;
  private clientBuildPath: string | undefined;
  private stylesCache = new Map<string, string>();

  async init({context}: {context: Context}) {
    const {
      config: {buildsPath},
      siteVersion,
      dependenciesGraph,
      database,
    } = context;

    this.database = database;

    await dependenciesGraph.onCompleted([siteVersionDependency]);

    const version = siteVersion.getVersion();
    const buildName = `site-${version}`;

    const manifestStr = await readFile(
      path.join(buildsPath, buildName, 'server/manifest.json'),
      {encoding: 'utf8'},
    );
    const manifestJson = JSON.parse(manifestStr);

    const manifest = SiteManifest.parse(manifestJson);

    const mod = await import(
      path.join(buildsPath, buildName, 'server/server.js')
    );

    this.renderFn = mod.render as FiestaRenderFun;
    this.manifest = manifest;
    this.clientBuildPath = path.join(buildsPath, buildName, 'client');
    this.stylesCache = new Map();

    dependenciesGraph.markCompleted(siteRendererDependency);
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
