import {makeAutoObservable} from 'mobx';
import {ChangeEventHandler} from 'react';

export class TextStore {
  _value = '';

  constructor(options: {initialValue?: string} = {}) {
    this._value = options.initialValue ?? '';

    makeAutoObservable(this);
  }

  get value(): string {
    return this._value;
  }

  get valueTrimmed(): string {
    return this._value.trim();
  }

  onChange: ChangeEventHandler<HTMLInputElement> = (event): void => {
    this._value = event.target.value;
  };
}
