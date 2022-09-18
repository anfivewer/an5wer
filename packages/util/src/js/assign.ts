export const safeAssign = <S extends Record<string, unknown>, D extends S>(
  destination: D,
  source: S,
): D => Object.assign(destination, source);
