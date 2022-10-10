import {FiestaDirectus} from '../types';

export const setupKv = async ({directus}: {directus: FiestaDirectus}) => {
  const kvItems = directus.items('kv');

  const siteVersion = await kvItems.readByQuery({
    filter: {key: {_eq: 'site-version'}},
  });

  if (!siteVersion.data?.length) {
    await kvItems.createOne({key: 'site-version', value: '0.0.1'});
  }
};
