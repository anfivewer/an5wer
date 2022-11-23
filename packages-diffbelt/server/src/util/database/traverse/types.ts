import {KeyValueRecord} from '@-/diffbelt-types/src/database/types';

export type TraverserApiMarker = {
  readonly _isTraverserApiMarker: unique symbol;
};

export type TraverserApi = {
  getItem: () => KeyValueRecord;

  getMarker: () => TraverserApiMarker;
  goMarker: (marker: TraverserApiMarker) => void;

  hasPrev: () => boolean;
  peekPrev: () => KeyValueRecord | null;
  goPrev: () => void;
  hasNext: () => boolean;
  peekNext: () => KeyValueRecord | null;
  goNext: () => void;
};
