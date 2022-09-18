interface Array<T> {
  filter(
    predicate: BooleanConstructor,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any,
  ): Exclude<T, null | undefined | false>[];
}
