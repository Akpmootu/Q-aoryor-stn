export interface QueueState {
  prefix: string; // "W" or "O"
  numbers: {
    W: number;
    O: number;
  };
  counter: string; // "1" or "2"
}
