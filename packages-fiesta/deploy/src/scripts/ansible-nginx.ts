import {readFile, writeFile} from 'fs/promises';
import {deepEquals} from '@-/util/src/object/deep-equals';
import {assertNonNullable} from '@-/types/src/assert/runtime';
import {readExecutionConfig} from './helpers';

let envError: Error | undefined;
const getEnvVariable = (name: string): string => {
  const value = process.env[name];
  if (value) {
    return value;
  }

  const message = `no ${name} env var`;
  console.error(message);

  if (!envError) {
    envError = new Error(message);
  }

  return '';
};

const NGINX_SITE_CONF = getEnvVariable('FIESTA_NGINX_SITE_CONF');

if (envError) {
  throw envError;
}

const fixNginxConfig = async ({port}: {port: number}) => {
  const content = await readFile(NGINX_SITE_CONF, {encoding: 'utf8'});

  const lines = content.split('\n').filter((line) => Boolean(line.trim()));

  const writeConfig = () =>
    writeFile(NGINX_SITE_CONF, lines.join('\n') + '\n', {encoding: 'utf8'});

  let certbotLinesStartPos = -1;
  let isPortChanged = false;

  const curlyOpenWords: string[] = [];

  lines.forEach((line, index) => {
    const curlyOpenMatch = /\s*([a-z]+).*{\s*/.exec(line);
    if (curlyOpenMatch) {
      const [, word] = curlyOpenMatch;
      curlyOpenWords.push(word);
    }

    if (certbotLinesStartPos < 0 && line.includes('managed by Certbot')) {
      certbotLinesStartPos = index;
    }

    if (line.includes('proxy_pass http://127.0.0.1:')) {
      lines[index] = line.replace(/:\d+\/;/, `:${port}/;`);
      isPortChanged = true;
    }
  });

  if (certbotLinesStartPos < 0) {
    throw new Error('no certbot');
  }

  curlyOpenWords.sort();

  if (curlyOpenWords.length < 1 || curlyOpenWords.length > 2) {
    throw new Error(`Bad nginx.conf [1], words: ${curlyOpenWords.join(', ')}`);
  }

  const isValidWords = deepEquals(
    curlyOpenWords,
    curlyOpenWords.length === 1 ? ['server'] : ['location', 'server'],
    {noLoops: true},
  );

  if (!isValidWords) {
    throw new Error(`Bad nginx.conf [2], words: ${curlyOpenWords.join(', ')}`);
  }

  if (!isPortChanged) {
    if (curlyOpenWords.length !== 1) {
      throw new Error('has location block, but port is not changed');
    }

    const locationLines = [
      '  location / {',
      `    proxy_pass http://127.0.0.1:${port}/;`,
      '  }',
    ];

    lines.splice(certbotLinesStartPos, 0, ...locationLines);
  }

  await writeConfig();
};

(async () => {
  const config = await readExecutionConfig();

  const {nextExecution} = config;
  assertNonNullable(nextExecution, 'no nextExecution');

  const {port} = nextExecution;

  await fixNginxConfig({port});
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
