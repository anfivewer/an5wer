import {Xoroshiro128Plus} from '@-/util/src/random/xoroshiro128plus';

export const createRandomGenerator = () =>
  new Xoroshiro128Plus({
    state: [0xbe08b36, 0x4e726c42, 0xf5dba26c, 0xc51e2a46],
  });
