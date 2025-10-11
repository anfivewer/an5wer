export type TodoDuration =
  | {type: 'undefined'}
  | {type?: never; resolution: 'm'; value: number}
  | {type?: never; resolution: 'h'; value: number};
