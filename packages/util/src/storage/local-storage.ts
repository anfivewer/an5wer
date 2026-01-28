export interface ILocalStorageProperty {
  get: () => string | null;
  set: (value: string) => void;
}

export class LocalStorageProperty implements ILocalStorageProperty {
  private name: string;
  private value: string | null = null;

  constructor(name: string) {
    this.name = name;

    try {
      this.value = localStorage.getItem(name);
    } catch (error) {
      console.error(error);
    }
  }

  get() {
    return this.value;
  }

  set(value: string | null) {
    this.value = value;

    try {
      if (typeof value === 'string') {
        localStorage.setItem(this.name, value);
      } else {
        localStorage.removeItem(this.name);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

export class MockLocalStorageProperty implements ILocalStorageProperty {
  private value: string | null = null;

  get() {
    return this.value;
  }

  set(value: string | null) {
    this.value = value;
  }
}

export const getLocalStorageProperty = (
  name: string,
): ILocalStorageProperty => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (typeof localStorage !== 'undefined' && localStorage) {
    return new LocalStorageProperty(name);
  } else {
    return new MockLocalStorageProperty();
  }
};
