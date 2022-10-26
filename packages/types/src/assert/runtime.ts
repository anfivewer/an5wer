class NonNullableAssertionError extends Error {
  name = 'NonNullableAssertionError';
}

export function assertNonNullable<T>(
  value: T,
  errorMessage?: string,
): asserts value is NonNullable<T> {
  if (value || typeof value === 'number' || typeof value === 'string') {
    return;
  }

  throw new NonNullableAssertionError(errorMessage);
}
