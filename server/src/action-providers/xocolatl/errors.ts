export class XocolatlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XocolatlError';
  }
}

export class InsufficientBalanceError extends XocolatlError {
  constructor(balance: string, required: string) {
    super(`Insufficient balance. You have ${balance} but need ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientAllowanceError extends XocolatlError {
  constructor(allowance: string, required: string) {
    super(`Insufficient allowance. Current allowance is ${allowance} but need ${required}`);
    this.name = 'InsufficientAllowanceError';
  }
}

export class UndercollateralizedError extends XocolatlError {
  constructor(ratio: string, required: string) {
    super(`Position would be undercollateralized. Current ratio ${ratio}% but need ${required}%`);
    this.name = 'UndercollateralizedError';
  }
}

export class WrongNetworkError extends XocolatlError {
  constructor() {
    super("Xocolatl protocol only works on Base Mainnet. Please switch your network to Base Mainnet.");
    this.name = 'WrongNetworkError';
  }
}