export const tryJsonParse = <T>(value: string, default_?: T): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return default_ ?? null;
  }
};
