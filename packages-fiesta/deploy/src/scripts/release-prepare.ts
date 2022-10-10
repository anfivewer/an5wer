import {readFile} from 'fs/promises';
import {resolve} from 'path';
import {VersionJson} from '@-/fiesta-types/src/site/version';

(async () => {
  const siteVersionContent = await readFile(
    resolve(__dirname, '../../../site/version.json'),
    {encoding: 'utf8'},
  );

  const siteVersionConfig = VersionJson.parse(JSON.parse(siteVersionContent));

  process.stdout.write(JSON.stringify(siteVersionConfig));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
