# an5wer monorepo

# Fiesta

## How to run

- Install [nvm](https://github.com/nvm-sh/nvm)

- Use node version:
  `nvm use`
  (maybe `nvm install` will be required)

- Install `pnpm`:
  `npm install -g pnpm`

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

- `@directus/sdk` is not supports latest TypeScript, remove `skipLibCheck` when it will
