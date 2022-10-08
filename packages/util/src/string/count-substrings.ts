export const countSubstrings = (str: string, substr: string): number => {
  let result = 0;

  let pos = -1;

  while (true) {
    pos = str.indexOf(substr, pos + 1);
    if (pos < 0) {
      break;
    }

    result++;
  }

  return result;
};
