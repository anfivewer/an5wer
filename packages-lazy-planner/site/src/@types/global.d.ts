declare module '*.jpg' {
  const url: string;
  export default url;
}

declare module '*.css' {
  const css: Record<string, string>;
  export default css;
}
