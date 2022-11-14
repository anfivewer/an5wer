export class Xoroshiro128Plus {
  private state: [number, number, number, number];

  constructor({
    state,
  }: {
    // 4 unsigned 32-bit integers
    state: Xoroshiro128Plus['state'];
  }) {
    if (state) {
      this.state = state.slice() as Xoroshiro128Plus['state'];
    } else {
      const time = (Date.now() | 0) >>> 0;
      this.state = [
        (time & ((Math.random() * 0xffffffff) | 0)) >>> 0,
        (time & ((Math.random() * 0xffffffff) | 0)) >>> 0,
        (time & ((Math.random() * 0xffffffff) | 0)) >>> 0,
        (time & ((Math.random() * 0xffffffff) | 0)) >>> 0,
      ];
    }
  }

  getState(): Xoroshiro128Plus['state'] {
    return this.state.slice() as Xoroshiro128Plus['state'];
  }

  // 2 32-bit unsigned integers
  next64(): [number, number] {
    const {state} = this;

    const s0: [number, number] = [state[0], state[1]];
    let s1: [number, number] = [state[2], state[3]];

    const result = sum64(s0, s1);

    s1 = xor64(s1, s0);
    const [a, b] = xor64(
      xor64(or64(shiftLeft64(s0, 55), shiftRight64(s0, 9)), s1),
      shiftLeft64(s1, 14),
    );
    const [c, d] = or64(shiftLeft64(s1, 36), shiftRight64(s1, 28));

    state[0] = a;
    state[1] = b;
    state[2] = c;
    state[3] = d;

    return result;

    function shiftLeft64(
      [x, y]: [number, number],
      count: number,
    ): [number, number] {
      // `32` case is not handled
      if (count < 32) {
        x = x << count;
        const a = (y >>> (32 - count)) & (Math.pow(2, count) - 1);
        x += a;
        return [x >>> 0, (y << count) >>> 0];
      } else {
        x = (y & (Math.pow(2, 64 - count) - 1)) << (count - 32);
        return [x >>> 0, 0];
      }
    }
    function shiftRight64(
      [x, y]: [number, number],
      count: number,
    ): [number, number] {
      // `32` case is not handled
      if (count < 32) {
        const a = x & (Math.pow(2, count) - 1);
        y = (y >>> count) + (a << (32 - count));
        return [x >>> count, y >>> 0];
      } else {
        const a = (x >> (count - 32)) & (Math.pow(2, 64 - count) - 1);
        x = (x >> (count - 32)) & (Math.pow(2, 64 - count) - 1);
        x = x + (a << (count - 32));
        return [0, x >>> 0];
      }
    }
    function or64(
      [a0, a1]: [number, number],
      [b0, b1]: [number, number],
    ): [number, number] {
      return [(a0 | b0) >>> 0, (a1 | b1) >>> 0];
    }
    function xor64(
      [a0, a1]: [number, number],
      [b0, b1]: [number, number],
    ): [number, number] {
      return [(a0 ^ b0) >>> 0, (a1 ^ b1) >>> 0];
    }
    function sum64(
      [a0, a1]: [number, number],
      [b0, b1]: [number, number],
    ): [number, number] {
      const [y, overflow] = sum32(a1, b1);
      const x = (a0 + b0 + (overflow ? 1 : 0)) >>> 0;
      return [x, y];
    }
    function sum32(a: number, b: number): [number, boolean] {
      let overflow = false;

      let max = 0xffffffff;
      max -= a;

      if (b > max) {
        overflow = true;
      }

      return [(a + b) >>> 0, overflow];
    }
  }
}
