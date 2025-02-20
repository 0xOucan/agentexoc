export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

export const WETH_ABI = [
  {
    constant: false,
    inputs: [],
    name: "deposit",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "wad", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
] as const;

// Separate ABIs for type safety
export const DEPOSIT_ABI = [{
  constant: false,
  inputs: [],
  name: "deposit",
  outputs: [],
  payable: true,
  stateMutability: "payable",
  type: "function",
}] as const;

export const WITHDRAW_ABI = [{
  constant: false,
  inputs: [{ name: "wad", type: "uint256" }],
  name: "withdraw",
  outputs: [],
  payable: false,
  stateMutability: "nonpayable",
  type: "function",
}] as const;