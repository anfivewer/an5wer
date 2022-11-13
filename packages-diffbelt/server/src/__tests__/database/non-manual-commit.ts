import {Defer} from '@-/util/src/async/defer';
import {sleep} from '@-/util/src/async/sleep';

export class NonManualCommitRunner {
  private defers: Defer[] = [];

  waitForNonManualGenerationCommit() {
    const defer = new Defer();
    this.defers.push(defer);
    return defer.promise;
  }

  async makeCommits() {
    while (this.defers.length) {
      while (this.defers.length) {
        this.defers.pop()!.resolve();
      }

      // FIXME: watch for collection planned commits
      await sleep(10);
    }
  }
}
