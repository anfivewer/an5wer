import {Defer} from './defer';

export class RwLock {
  private readBlockDefer: Defer | undefined;
  private writeBlockDefer: Defer | undefined;

  hasLocks({
    read = false,
    write = false,
  }: {read?: boolean; write?: boolean} = {}) {
    return Boolean(
      (read && this.readBlockDefer) || (write && this.writeBlockDefer),
    );
  }

  async waitLocks({
    read = false,
    write = false,
  }: {read?: boolean; write?: boolean} = {}): Promise<void> {
    while (true) {
      let hadLock = false;

      if (read && this.readBlockDefer) {
        hadLock = true;
        await this.readBlockDefer.promise;
      }

      if (write && this.writeBlockDefer) {
        hadLock = true;
        await this.writeBlockDefer.promise;
      }

      if (!hadLock) {
        break;
      }
    }
  }

  async blockRead<T>(fun: () => T | Promise<T>): Promise<T> {
    while (this.readBlockDefer) {
      await this.readBlockDefer;
    }

    const defer = new Defer();
    this.readBlockDefer = defer;

    try {
      return await fun();
    } finally {
      this.readBlockDefer = undefined;
      defer.resolve();
    }
  }

  async blockWrite<T>(fun: () => T | Promise<T>): Promise<T> {
    while (this.writeBlockDefer) {
      await this.writeBlockDefer;
    }

    const defer = new Defer();
    this.writeBlockDefer = defer;

    try {
      return await fun();
    } finally {
      this.writeBlockDefer = undefined;
      defer.resolve();
    }
  }

  async blockReadWrite<T>(fun: () => T | Promise<T>): Promise<T> {
    while (this.readBlockDefer || this.writeBlockDefer) {
      if (this.readBlockDefer) {
        await this.readBlockDefer;
      }
      if (this.writeBlockDefer) {
        await this.writeBlockDefer;
      }
    }

    const defer = new Defer();
    this.readBlockDefer = defer;
    this.writeBlockDefer = defer;

    try {
      return await fun();
    } finally {
      this.readBlockDefer = undefined;
      this.writeBlockDefer = undefined;
      defer.resolve();
    }
  }

  async createReadWriteBlocker(): Promise<() => void> {
    while (this.readBlockDefer || this.writeBlockDefer) {
      if (this.readBlockDefer) {
        await this.readBlockDefer;
      }
      if (this.writeBlockDefer) {
        await this.writeBlockDefer;
      }
    }

    const defer = new Defer();
    this.readBlockDefer = defer;
    this.writeBlockDefer = defer;

    return () => {
      this.readBlockDefer = undefined;
      this.writeBlockDefer = undefined;
      defer.resolve();
    };
  }
}
