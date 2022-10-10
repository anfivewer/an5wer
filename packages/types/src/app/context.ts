export const notInitializedContextValue = Symbol('notInitialized');

export type NonInitializedContext<Context> = {
  [Key in keyof Context]: Context[Key] | typeof notInitializedContextValue;
};
