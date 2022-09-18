import {FiestaDirectus} from '../types';

export const setupFolders = async ({directus}: {directus: FiestaDirectus}) => {
  const folders = await directus.folders.readByQuery({
    filter: {
      name: {_eq: 'public'},
    },
  });

  if (!folders.data?.length) {
    await directus.folders.createOne({name: 'public'});
  }
};
