import {FiestaRenderPage} from '@-/fiesta-types/src/site/pages';
import {
  FiestaRenderFun,
  FiestaRenderOptions,
} from '@-/fiesta-types/src/site/render';
import {readFile} from 'fs/promises';
import {join} from 'path';
import React, {ComponentType, FC} from 'react';
import ReactDOMServer from 'react-dom/server';
import {RootPageSsr} from '../components/pages/root/root-ssr';
import {getAdminPageState} from '../state/admin/admin';
import {getRootPageState} from '../state/root/root';
import {GetStateFn} from '../state/types';
import {STATE_KEY} from './constants';

const NoSsrComponent: FC<{state: unknown}> = () => null;

const rootId = 'root-63d16db3597b7e71';

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
  [FiestaRenderPage.root]: createEntry({
    component: RootPageSsr,
    getState: getRootPageState,
    devClient: '/src/entries/main-client.tsx',
  }),
  [FiestaRenderPage.admin]: createEntry({
    component: NoSsrComponent,
    getState: getAdminPageState,
    devClient: '/src/entries/admin-client.tsx',
  }),
};

export const render: FiestaRenderFun = async (options) => {
  const {page, manifest, clientBuildPath, stylesCache} = options;
  const {component, getState, devClient} = entryPages[page];

  const Component = component as ComponentType<{
    rootId: string;
    state: unknown;
  }>;
  const [state, styles] = await Promise.all([
    getState(options),
    renderStyles({manifest, clientBuildPath, stylesCache}),
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
          <title>Ford Fiesta 5609 MP-1</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href={
              'https://fonts.googleapis.com/css2?family=Roboto&family=Roboto+Condensed:wght@700&family=Roboto+Mono:wght@500&display=swap'
            }
            rel="stylesheet"
          />
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
}: Pick<
  FiestaRenderOptions,
  'manifest' | 'clientBuildPath' | 'stylesCache'
>) => {
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
