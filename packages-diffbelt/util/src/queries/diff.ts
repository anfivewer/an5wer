import {
  Collection,
  DiffOptions,
  DiffResultItems,
} from '@-/diffbelt-types/src/database/types';
import {FinishableStream} from '@-/types/src/stream/stream';
import {createFinishableStream} from '@-/util/src/stream/finishable-stream';

export const diffCollection = async (
  collection: Collection,
  {
    diffOptions,
    onInitialQuery,
    onReadCursor,
  }: {
    diffOptions: DiffOptions;
    onInitialQuery?: (options: {generationId: string}) => void;
    onReadCursor?: (options: {generationId: string}) => void;
  },
): Promise<{
  fromGenerationId: string | null;
  generationId: string;
  stream: FinishableStream<DiffResultItems>;
}> => {
  const {
    fromGenerationId,
    generationId: initialGenerationId,
    items,
    cursorId,
  } = await collection.diff(diffOptions);

  onInitialQuery?.({generationId: initialGenerationId});

  let isClosed = false;
  const stream = createFinishableStream<DiffResultItems>({
    onClosed: () => {
      isClosed = true;
    },
  });

  stream.push(items);

  (async () => {
    let currentCursor = cursorId;

    while (currentCursor) {
      const {generationId, items, cursorId} = await collection.readDiffCursor({
        cursorId: currentCursor,
      });

      if (isClosed) {
        return;
      }

      onReadCursor?.({generationId});

      stream.push(items);

      currentCursor = cursorId;
    }

    stream.finish();
  })().catch(stream.destroyWithError.bind(stream));

  return {
    fromGenerationId,
    generationId: initialGenerationId,
    stream: stream.getGenerator(),
  };
};
