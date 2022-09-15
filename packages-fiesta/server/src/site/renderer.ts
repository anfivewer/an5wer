import {readFile} from 'fs/promises';
import path from 'path';
import {Context} from '../types/context';
import {
  siteRendererDependency,
  siteVersionDependency,
} from '../context/dependencies';
import {
  FiestaRenderFun,
  FiestaRenderPage,
  RequestData,
} from '@-/fiesta-site/src/entries/types';
import {SiteManifest, SiteRenderer} from './types';

export class SiteRendererProd implements SiteRenderer {
  private manifest: SiteManifest | undefined;
  private renderFn: FiestaRenderFun | undefined;
  private clientBuildPath: string | undefined;
  private stylesCache = new Map<string, string>();

  async init({context}: {context: Context}) {
    const {
      config: {buildsPath},
      siteVersion,
      dependenciesGraph,
    } = context;

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
    });
  }
}
