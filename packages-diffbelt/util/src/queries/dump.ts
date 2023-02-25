import {
  Collection,
  EncodedValue,
  KeyValue,
} from '@-/diffbelt-types/src/database/types';
import {FinishableStream} from '@-/types/src/stream/stream';
import {createFinishableStream} from '@-/util/src/stream/finishable-stream';

export const queryCollection = async (
  collection: Collection,
  {
    generationId,
    onInitialQuery,
    onReadCursor,
  }: {
    generationId?: EncodedValue;
    onInitialQuery?: (options: {generationId: EncodedValue}) => void;
    onReadCursor?: (options: {generationId: EncodedValue}) => void;
  } = {},
): Promise<{
  generationId: EncodedValue;
  stream: FinishableStream<KeyValue[]>;
}> => {
  const {
    generationId: initialGenerationId,
    items,
    cursorId,
  } = await collection.query({generationId});

  onInitialQuery?.({generationId: initialGenerationId});

  let isClosed = false;
  const stream = createFinishableStream<KeyValue[]>({
    onClosed: () => {
      isClosed = true;
    },
  });

  stream.push(items);

  (async () => {
    let currentCursor = cursorId;

    while (typeof currentCursor === 'string') {
      const {generationId, items, cursorId} = await collection.readQueryCursor({
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

  return {generationId: initialGenerationId, stream: stream.getGenerator()};
};

export const dumpCollection = async (
  collection: Collection,
  {
    onInitialQuery,
    onReadCursor,
  }: {
    onInitialQuery?: (options: {generationId: EncodedValue}) => void;
    onReadCursor?: (options: {generationId: EncodedValue}) => void;
  } = {},
) => {
  const {generationId, stream} = await queryCollection(collection, {
    onInitialQuery,
    onReadCursor,
  });

  const allItems: KeyValue[] = [];

  for await (const items of stream) {
    items.forEach((item) => {
      allItems.push(item);
    });
  }

  return {items: allItems, generationId};
};
