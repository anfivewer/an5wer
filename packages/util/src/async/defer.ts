export class Defer<R = void> {
  public resolve!: (value: R) => void;
  public reject!: (error: unknown) => void;
  public promise: Promise<R>;
  private _isFulfilled = false;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (value) => {
        resolve(value);
        this._isFulfilled = true;
      };
      this.reject = (error) => {
        reject(error);
        this._isFulfilled = true;
      };
    });
  }

  isFulfilled(): boolean {
    return this._isFulfilled;
  }
}
