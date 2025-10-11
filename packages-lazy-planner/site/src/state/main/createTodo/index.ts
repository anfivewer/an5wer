import {makeAutoObservable} from 'mobx';
import type {MainStore} from '../store';
import {TodoStore} from '../todo/todoStore';

export class CreateTodoStore {
  #mainStore: MainStore;
  _isCancelConfirmVisible = false;

  constructor(options: {mainStore: MainStore}) {
    this.#mainStore = options.mainStore;

    makeAutoObservable(this);
  }

  todo = new TodoStore();

  get isSaveDisabled(): boolean {
    return !this.todo.isValid;
  }

  isCancelConfirmVisible = () => this._isCancelConfirmVisible;
  onCancelClick = () => {
    if (!this.todo.isChanged) {
      this.onCancelConfirm();
      return;
    }

    this._isCancelConfirmVisible = true;
  };
  onCancelConfirm = () => {
    this._isCancelConfirmVisible = false;
    this.#mainStore.mainRoute.goTo();
  };
  onCancelReject = () => {
    this._isCancelConfirmVisible = false;
  };
}
