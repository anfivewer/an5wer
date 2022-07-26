import React, {ComponentType, FC} from 'react';
import ReactDOMServer from 'react-dom/server';
import {Fiesta} from '../components/pages/fiesta/fiesta';
import {STATE_KEY} from './constants';
import {FiestaRenderFun, FiestaRenderPage} from './types';

const NoSsrComponent: FC<{state: {rootId: string}}> = () => null;

const rootId = 'root-63d16db3597b7e71';

const createEntry = <T,>(options: {
  component: ComponentType<{state: T}>;
  getState: () => Promise<T>;
  devClient: string;
}): {
  component: ComponentType<{state: T}>;
  getState: () => Promise<T>;
  devClient: string;
} => {
  return options;
};

const entryPages = {
  [FiestaRenderPage.root]: createEntry({
    component: Fiesta,
    getState: () => Promise.resolve({rootId, answer: 42}),
    devClient: '/src/entries/main-client.tsx',
  }),
  [FiestaRenderPage.admin]: createEntry({
    component: NoSsrComponent,
    getState: () => Promise.resolve({rootId}),
    devClient: '/src/entries/admin-client.tsx',
  }),
};

export const render: FiestaRenderFun = async ({page, manifest}) => {
  const {component, getState, devClient} = entryPages[page];

  const Component = component as ComponentType<{state: unknown}>;
  const state = await getState();

  const stateScript = `window.${STATE_KEY}=${JSON.stringify(state)};`;

  const content = ReactDOMServer.renderToString(
    <>
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Vite App</title>
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
        </head>

        <body>
          <div id={state.rootId}>
            {!manifest ? null : <Component state={state} />}
          </div>
          <script dangerouslySetInnerHTML={{__html: stateScript}} />
          {!manifest ? (
            <script type="module" src={devClient} />
          ) : (
            manifest.js.map((path, index) => <script key={index} src={path} />)
          )}
        </body>
      </html>
    </>,
  );

  return `<!doctype html>${content}`;
};
