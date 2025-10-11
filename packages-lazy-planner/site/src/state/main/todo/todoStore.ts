import {TextStore} from '@-/util-react/src/mobx/textStore';
import {makeAutoObservable} from 'mobx';
import {TodoDuration} from './types';

type TodoStoreOptions = {
  current: TodoStore | null;
};

export class TodoStore {
  #prev: TodoStore;
  #current: TodoStore;

  constructor(options?: TodoStoreOptions) {
    const {current = null} = options || {};

    if (current) {
      this.#prev = this;
      this.#current = current;
    } else {
      this.#current = this;
      this.#prev = new TodoStore({current: this});
    }

    makeAutoObservable(this);
  }

  title = new TextStore();
  estimateDurationText = new TextStore();

  get estimateDuration(): TodoDuration | 'invalid' {
    const text = this.estimateDurationText.valueTrimmed;
    if (!text) {
      return {type: 'undefined'};
    }

    const match = /^(\d+(?:\.\d\d?)?)(h|m)?$/.exec(text);
    if (!match) {
      return 'invalid';
    }

    const [, numberStr, resolutionRaw] = match;

    const resolution = resolutionRaw ?? 'm';

    let n = parseFloat(numberStr);
    n = Math.round(n * 100) / 100;

    if (resolution !== 'm' && resolution !== 'h') {
      return 'invalid';
    }

    if (resolution === 'm' && Math.floor(n) !== n) {
      return 'invalid';
    }

    return {resolution, value: n};
  }

  get isValid(): boolean {
    return (
      Boolean(this.title.valueTrimmed) && this.estimateDuration !== 'invalid'
    );
  }

  get isChanged(): boolean {
    return this.#current.title.valueTrimmed !== this.#prev.title.valueTrimmed;
  }
}
