# an5wer monorepo

# Fiesta

## How to run

- Install [nvm](https://github.com/nvm-sh/nvm)

- Use node version:
  `nvm use`
  (maybe `nvm install` will be required)

- Install `pnpm`:
  `npm install -g pnpm@7.12.1`

- Fetch dependencies inside clone of this repo:
  `pnpm install`

- Copy `.env.example` to `.env`:
  `cp .env.example .env`

- Edit it, change `FIESTA_DATA_PATH` to some path like:
  `FIESTA_DATA_PATH = /home/your-user/projects/fiesta-data`

- Run:
  `npm run start:fiesta`

- Open [http://localhost:3001/](http://localhost:3001/)

# tsconfig

## `skipLibCheck`

- `@directus/sdk` is not supports latest TypeScript
- `recharts` contain bad typedefs:

```
../../node_modules/.pnpm/recharts@2.1.16_fbbixigdshhwz6qslju44ayfr4/node_modules/recharts/types/component/LabelList.d.ts:21:70 - error TS2344: Type 'T' does not satisfy the constraint 'Data'.

21 export declare type Props<T> = SVGProps<SVGElement> & LabelListProps<T>;

  ../../node_modules/.pnpm/recharts@2.1.16_fbbixigdshhwz6qslju44ayfr4/node_modules/recharts/types/component/LabelList.d.ts:21:27
    21 export declare type Props<T> = SVGProps<SVGElement> & LabelListProps<T>;
                                 ~
    This type parameter might need an `extends Data` constraint.
```
