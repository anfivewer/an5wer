import {makeAutoObservable} from 'mobx';
import type {MainStore} from '../store';

export class CreateTodoStore {
  #mainStore: MainStore;
  _isCancelConfirmVisible = false;

  constructor(options: {mainStore: MainStore}) {
    this.#mainStore = options.mainStore;

    makeAutoObservable(this);
  }

  isCancelConfirmVisible = () => this._isCancelConfirmVisible;
  onCancelClick = () => {
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
