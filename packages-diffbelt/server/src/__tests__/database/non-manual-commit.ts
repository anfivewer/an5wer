import {Defer} from '@-/util/src/async/defer';
import {IdlingStatus} from '@-/util/src/state/idling-status';

export class NonManualCommitRunner {
  private defers: Defer[] = [];
  private getDatabaseIdling: () => IdlingStatus;

  constructor({
    getDatabaseIdling,
  }: {
    getDatabaseIdling: NonManualCommitRunner['getDatabaseIdling'];
  }) {
    this.getDatabaseIdling = getDatabaseIdling;
  }

  waitForNonManualGenerationCommit() {
    const defer = new Defer();
    this.defers.push(defer);
    return defer.promise;
  }

  hasPendingCommits() {
    return Boolean(this.defers.length);
  }

  async makeCommits(): Promise<void> {
    const idling = this.getDatabaseIdling();

    while (true) {
      while (this.defers.length) {
        this.defers.pop()!.resolve();
      }

      await idling.onIdle();

      if (idling.isIdle() && !this.defers.length) {
        return;
      }
    }
  }
}
