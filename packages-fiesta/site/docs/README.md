# Fiesta site

This package contains frontend of https://fiesta.an5wer.com/

# Entrypoint

There is two kinds of entrypoints:

- SSR
- Client scripts

SSR part is single module located at [packages-fiesta/site/src/entries/server.tsx](https://github.com/anfivewer/an5wer/blob/develop/packages-fiesta/site/src/entries/server.tsx). It provides HTML template for all pages.

Client scripts are separate modules for each kind of page. They are located in the [packages-fiesta/site/src/entries](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/entries) folder postfixed by `-client`.

## Adding new entrypoint

Oh, I need to simplify it.

- Create `new-entry-client.tsx` in the [packages-fiesta/site/src/entries](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/entries) folder
- Add it to the build in the [vite-client.config.ts](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/vite-client.config.ts)
- And to `ENTRIES` in the [packages-fiesta/site/src/build/build.ts](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/build/build.ts)
- Add new value to the enum [FiestaRenderPageEnum](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/types/src/site/pages.ts), for example `'newEntry'`
- Create initial state type in the [packages-fiesta/types/src/site/state](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/types/src/site/state) folder
- Create initial state initializer in the [packages-fiesta/site/src/state](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/state) folder, it can interact with server API to fetch some data from the database which will be used in the SSR/passed to client side for hydration
- Add declaration of new entrypoint to `entryPages` in the [packages-fiesta/site/src/entries/server.tsx](https://github.com/anfivewer/an5wer/blob/develop/packages-fiesta/site/src/entries/server.tsx)
- Create new route in the server package at [packages-fiesta/server/src/routes](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/server/src/routes), it should call `siteRenderer.render` with new entrypoint type, in our example it's `FiestaRenderPageEnum.newEntry`
- Register new route in the [packages-fiesta/server/src/main.ts](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/server/src/main.ts)
- You are awesome

# Technologies stack

## MobX-State-Tree

We are using [MobX-State-Tree](https://mobx-state-tree.js.org/) for managing state of the app.

Models should be located in the [packages-fiesta/site/src/state](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/state) folder, root models are placed in files named `mst.ts`, all exported models should have `Mst` postfix.

Writing business-logic inside model actions are discouraged (`admin` entrypoint does so, but this is temporary solution). Instead you need to extend `dispatch` function, for example, [packages-fiesta/site/src/state/root/dispatch.ts](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/state/root/dispatch.ts) and then write logic in the implementation of `dispatch`.

## CSS Modules

All CSS files should be postfixed with `.module.css`. Then you need to import it from a component module like `import styles from './fiesta.module.css';` and use classnames declared in a CSS file only via `styles` object. For example, we're have such CSS:

```
.page {
  background: red;
}
```

Then you import it:

```
import styles from './my-awesome-page.module.css';
```

And use inside of component:

```
<div className={styles.page}>...</div>
```

### CSS Utilities

There is bunch of utilities located at [packages-fiesta/site/src/css](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/css).

Colors, margin/padding values, font sizes should be used only by variables/mixins provided by this utilities. See [packages-fiesta/site/src/components/pages/fiesta/fiesta.module.css](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/components/pages/fiesta/fiesta.module.css) and [packages-fiesta/site/src/components/pages/fiesta/fiesta.tsx](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/components/pages/fiesta/fiesta.tsx) for example usages of utilities/variables.

# Entrypoints

## `root`

Currently main entrypoint, should contain all frontend subpages. Pages:

- `car` — page of car with info, brief list of last/upcoming events
- `carEvents` — separate page with more detailed list of last/upcoming events

To switch page you need to call:

```
dispatch({
  type: RootDispatchEventType.switchPage,
  page: {
    name: PageName.carEvents,
  },
});
```

New pages should be created in the [packages-fiesta/site/src/components/pages](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/components/pages) folder, then their render should be supported in the [root component](https://github.com/anfivewer/an5wer/tree/develop/packages-fiesta/site/src/components/pages/root/root.tsx).

## `admin`

Has no SSR, work still in the progress, provides simple form for adding events (later there will be feature to upload photos, it's not very convinient to do it from Directus admin panel).

# Design layouts

Currently they are private, accessible by https://www.figma.com/file/jdV9eIfLvqlpfIL30DA6vs/
