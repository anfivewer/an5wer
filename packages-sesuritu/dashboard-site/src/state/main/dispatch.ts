export const enum MainDispatchEventType {
  log = 'log',
  noop = 'noop',
}

export type MainDispatchEvent =
  | {
      type: MainDispatchEventType.noop;
    }
  | {type: MainDispatchEventType.log; key: string; extra?: unknown};

export type MainDispatchFn = (event: MainDispatchEvent) => void;
