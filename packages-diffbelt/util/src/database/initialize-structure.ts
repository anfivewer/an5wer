import {Database} from '@-/diffbelt-types/src/database/types';

export type CollectionsStructure = {
  name: string;
  isManual?: boolean;
  readers?: {name: string; collectionName: string | undefined}[];
}[];

export const initializeDatabaseStructure = async ({
  database,
  collections,
}: {
  database: Database;
  collections: CollectionsStructure;
}) => {
  const collectionsSet = new Set(
    (await database.listCollections()).collections,
  );

  await Promise.all(
    collections.map(
      async ({name, isManual = false, readers: expectedReaders}) => {
        const createCollection = () =>
          database.createCollection({
            name,
            generationId: isManual ? '' : undefined,
          });

        if (!collectionsSet.has(name)) {
          await createCollection();
        }

        const collection = await database.getCollection(name);

        if (collection.isManual() !== Boolean(isManual)) {
          await database.deleteCollection(name);
          await createCollection();
        }

        const actualReaders = await collection.listReaders();
        const actualReadersMap = new Map(
          actualReaders.items.map((reader) => [reader.readerId, reader]),
        );

        const promises: Promise<void>[] = [];

        // Create/update readers to match the structure
        expectedReaders?.forEach(({name, collectionName}) => {
          const actualReader = actualReadersMap.get(name);
          if (!actualReader) {
            promises.push(
              collection.createReader({
                readerId: name,
                generationId: null,
                collectionName,
              }),
            );
            return;
          }

          const {collectionName: actualCollectionId} = actualReader;
          if (collectionName === actualCollectionId) {
            return;
          }

          promises.push(
            (async () => {
              await collection.deleteReader({readerId: name});
              await collection.createReader({
                readerId: name,
                generationId: null,
                collectionName,
              });
            })(),
          );
        });

        await Promise.all(promises);
      },
    ),
  );
};
