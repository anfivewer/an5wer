const SYMBOLS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SYMBOLS_COUNT = SYMBOLS.length;
const CHAR_TO_N: Record<string, number> = {};

for (let i = 0; i < SYMBOLS.length; i++) {
  const char = SYMBOLS[i];
  CHAR_TO_N[char] = i;
}

export const ALPHA_INITIAL_GENERATION_ID = '00000000000';

export const generateNextId = (id: string) => {
  let nextId = id;

  for (let i = 10; i >= 0; i--) {
    const n = (CHAR_TO_N[nextId[i]] + 1) % SYMBOLS_COUNT;

    nextId = `${nextId.slice(0, i)}${SYMBOLS[n]}${nextId.slice(i + 1)}`;

    if (n !== 0) {
      break;
    }
  }

  return nextId;
};

export class AlphaGenerationIdGenerator {
  private id: string;

  constructor(id = ALPHA_INITIAL_GENERATION_ID) {
    this.id = id;
  }

  getId() {
    return this.id;
  }

  generateNextId() {
    this.id = generateNextId(this.id);

    return this.id;
  }
}
