import {Defer} from '../async/defer';
import {sleep} from '../async/sleep';
import {createStream} from './stream';

describe('stream', () => {
  it('should finish on async pushing&finish', async () => {
    const stream = createStream<string>();

    const startPushingDefer = new Defer();

    const pushingPromise = (async () => {
      await startPushingDefer.promise;
      stream.push('a');
      stream.push('b');
      await sleep(1);
      stream.finish();
    })();

    const readingPromise = (async () => {
      sleep(0).then(() => {
        startPushingDefer.resolve();
      });

      const items: string[] = [];

      for await (const item of stream.getGenerator()) {
        items.push(item);
      }

      return items;
    })();

    await pushingPromise;
    const items = await readingPromise;

    expect(items).toStrictEqual(['a', 'b']);
  });

  it('should not leak memory on for..await', async () => {
    const N = 10;
    const M = 1024 * 1024;

    const stream = createStream<number[]>();

    const pushingPromise = (async () => {
      for (let i = 0; i < N; i++) {
        const array: number[] = [];

        for (let i = 0; i < M; i++) {
          array.push(i);
        }

        stream.push(array);

        await sleep(10);
      }

      stream.finish();
    })();

    const readingPromise = (async () => {
      const memory: number[] = [];
      let lengths = 0;

      for await (const item of stream.getGenerator()) {
        // @ts-ignore
        global.gc();
        const rss = process.memoryUsage().rss / 1024 / 1024;

        lengths += item.length;
        memory.push(rss);
      }

      return [memory, lengths] as const;
    })();

    await pushingPromise;
    const [memory, lengths] = await readingPromise;

    expect(lengths).toBe(N * M);

    const diffs: number[] = [];

    for (let i = 1; i < memory.length; i++) {
      diffs.push(memory[i] - memory[i - 1]);
    }

    diffs.sort((a, b) => a - b);

    const medianDiff = diffs[Math.floor((N - 1) / 2)];

    expect(medianDiff).toBeLessThanOrEqual(0.5);
  });
});
