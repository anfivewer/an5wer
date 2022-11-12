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
    await sleep(10);

    while (this.defers.length) {
      this.defers.pop()!.resolve();
    }
  }
}
