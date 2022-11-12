import {SiteRenderPage} from '@-/sesuritu-types/src/site/pages';
import {
  SiteRenderFun,
  SiteRenderOptions,
} from '@-/sesuritu-types/src/site/render';
import {readFile} from 'fs/promises';
import {join} from 'path';
import React, {ComponentType} from 'react';
import ReactDOMServer from 'react-dom/server';
import {MainPageEntry} from '../components/pages/main/main-entry';
import {getMainPageState} from '../state/main/main';
import {GetStateFn} from '../state/types';
import {STATE_KEY} from './constants';

const rootId = `id${STATE_KEY}`;

const createEntry = <T,>(options: {
  component: ComponentType<{rootId: string; state: T}>;
  getState: GetStateFn<T>;
  devClient: string;
}): {
  component: ComponentType<{rootId: string; state: T}>;
  getState: GetStateFn<T>;
  devClient: string;
} => {
  return options;
};

const entryPages = {
  [SiteRenderPage.main]: createEntry({
    component: MainPageEntry,
    getState: getMainPageState,
    devClient: '/src/entries/main-client.tsx',
  }),
};

export const render: SiteRenderFun = async (options) => {
  const {
    page,
    manifest,
    clientBuildPath,
    stylesCache,
    jsCache,
    inlineJs = false,
  } = options;
  const {component, getState, devClient} = entryPages[page];

  const Component = component as ComponentType<{
    rootId: string;
    state: unknown;
  }>;
  const [state, styles, renderedInlineJs] = await Promise.all([
    getState(options),
    renderStyles({manifest, clientBuildPath, stylesCache}),
    inlineJs
      ? renderInlineJs({manifest, clientBuildPath, jsCache})
      : Promise.resolve(null),
  ]);

  const stateScript = `window.${STATE_KEY}=${JSON.stringify({rootId, state})};`;

  const content = ReactDOMServer.renderToString(
    <>
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Title</title>
          {styles}
        </head>

        <body>
          <div id={rootId}>
            {!manifest ? null : <Component rootId={rootId} state={state} />}
          </div>
          <script dangerouslySetInnerHTML={{__html: stateScript}} />
          {!manifest ? (
            <script type="module" src={devClient} />
          ) : (
            (() => {
              if (inlineJs) {
                return renderedInlineJs;
              }

              const {basePath} = manifest;

              return manifest.js.map((path, index) => (
                <script type="module" key={index} src={`${basePath}${path}`} />
              ));
            })()
          )}
        </body>
      </html>
    </>,
  );

  return `<!doctype html>${content}`;
};

const renderStyles = ({
  manifest,
  clientBuildPath,
  stylesCache,
}: Pick<SiteRenderOptions, 'manifest' | 'clientBuildPath' | 'stylesCache'>) => {
  if (!manifest) {
    return Promise.resolve(null);
  }

  const promises = manifest.css.map(async (cssPath) => {
    const cached = stylesCache.get(cssPath);

    const content =
      cached ||
      (await readFile(join(clientBuildPath, cssPath), {
        encoding: 'utf8',
      }));

    if (!cached) {
      stylesCache.set(cssPath, content);
    }

    return <style key={cssPath}>{content}</style>;
  });

  return Promise.all(promises);
};

const renderInlineJs = ({
  manifest,
  clientBuildPath,
  jsCache,
}: Pick<SiteRenderOptions, 'manifest' | 'clientBuildPath' | 'jsCache'>) => {
  if (!manifest) {
    return Promise.resolve(null);
  }

  const promises = manifest.js.map(async (jsPath) => {
    const cached = jsCache.get(jsPath);

    const content =
      cached ||
      (await readFile(join(clientBuildPath, jsPath), {
        encoding: 'utf8',
      }));

    if (!cached) {
      jsCache.set(jsPath, content);
    }

    return (
      <script key={jsPath} dangerouslySetInnerHTML={{__html: content}}></script>
    );
  });

  return Promise.all(promises);
};
