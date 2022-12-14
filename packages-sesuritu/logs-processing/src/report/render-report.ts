import {SiteRenderFun} from '@-/sesuritu-types/src/site/render';
import {readFile, writeFile} from 'fs/promises';
import {resolve} from 'path';
import {SiteManifest} from '@-/sesuritu-types/src/site/manifest';
import {SiteRenderPage} from '@-/sesuritu-types/src/site/pages';
import {Context} from '../context/types';
import {collectReportData} from './collect-report-data';

export const renderReport = async ({context}: {context: Context}) => {
  const {
    config: {reportPath},
  } = context;

  if (typeof reportPath !== 'string') {
    return;
  }

  const buildPath = resolve(__dirname, '../../../dashboard-site/dist');

  const mod = await import(resolve(buildPath, 'server/main.js'));

  const manifestJson = await readFile(
    resolve(buildPath, 'server/manifest.json'),
    {encoding: 'utf8'},
  );
  const manifestObj = JSON.parse(manifestJson);

  const siteManifest = SiteManifest.parse(manifestObj);

  const render: SiteRenderFun = mod.render;

  const data = await collectReportData({context});

  const html = await render({
    manifest: siteManifest.entries.main,
    page: SiteRenderPage.main,
    request: {
      url: '/',
    },
    clientBuildPath: resolve(buildPath, 'client'),
    stylesCache: new Map(),
    jsCache: new Map(),
    inlineJs: true,
    getReport: () => data,
  });

  await writeFile(reportPath, html, {encoding: 'utf8'});
};
