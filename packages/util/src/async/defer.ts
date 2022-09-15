export class Defer<R = void> {
  public resolve!: (value: R) => void;
  public reject!: (error: Error) => void;
  public promise: Promise<R>;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
