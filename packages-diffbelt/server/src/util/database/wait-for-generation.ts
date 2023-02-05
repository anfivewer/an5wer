import {Collection} from '@-/diffbelt-types/src/database/types';

export const waitForGeneration = async ({
  collection,
  generationId,
}: {
  collection: Collection;
  generationId: string;
}) => {
  const stream = collection.getGenerationStream();

  for await (const currentGenerationId of stream) {
    if (currentGenerationId.generationId >= generationId) {
      return;
    }
  }
};
