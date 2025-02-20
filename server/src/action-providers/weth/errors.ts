export class WethError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WethError';
  }
}

export class InsufficientBalanceError extends WethError {
  constructor(balance: string, required: string) {
    super(`Insufficient balance. You have ${balance} but need ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class WrongNetworkError extends WethError {
  constructor(expected: string, actual: string) {
    super(`Wrong network. Expected ${expected} but got ${actual}`);
    this.name = 'WrongNetworkError';
  }
}