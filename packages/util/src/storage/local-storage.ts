export class LocalStorageProperty {
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
      if (value) {
        localStorage.setItem(this.name, value);
      } else {
        localStorage.removeItem(this.name);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

export class MockLocalStorageProperty {
  private value: string | null = null;

  get() {
    return this.value;
  }

  set(value: string | null) {
    this.value = value;
  }
}

export const getLocalStorageProperty = (name: string) => {
  if (typeof localStorage !== 'undefined' && localStorage) {
    return new LocalStorageProperty(name);
  } else {
    return new MockLocalStorageProperty();
  }
};
