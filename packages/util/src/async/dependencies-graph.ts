import {Defer} from './defer';

export class DependenciesGraph {
  private completed = new Set<symbol>();
  private awaitingCompletion = new Map<symbol, Defer>();

  markCompleted(symbol: symbol) {
    this.completed.add(symbol);

    const defer = this.awaitingCompletion.get(symbol);
    if (!defer) {
      return;
    }

    this.awaitingCompletion.delete(symbol);
    defer.resolve();
  }

  async onCompleted(dependsOn: symbol[]): Promise<void> {
    const dependenciesToWait = dependsOn.filter(
      (symbol) => !this.completed.has(symbol),
    );

    await Promise.all(
      dependenciesToWait.map((symbol) => {
        let defer = this.awaitingCompletion.get(symbol);
        if (!defer) {
          defer = new Defer();
          this.awaitingCompletion.set(symbol, defer);
        }

        return defer.promise;
      }),
    );
  }
}
