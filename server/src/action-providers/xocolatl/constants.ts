export const XOCOLATL_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf";
export const HOUSE_OF_RESERVE_ADDRESS = "0xf6b0A809AEb7157E5A1e2C0111cd58FB4987b136";
export const ACCOUNT_LIQUIDATOR_ADDRESS = "0x4b75Fb5B0D323672fc6Eac5Afbf487AE4c2ff6de";

export const XOCOLATL_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "balance" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const HOUSE_OF_RESERVE_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const HOUSE_OF_COIN_ABI = [
  {
    inputs: [
      { name: "reserveAsset", type: "address" },
      { name: "houseOfReserve", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mintCoin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const LIQUIDATOR_ABI = [
  {
    inputs: [
      { name: "userToLiquidate", type: "address" },
      { name: "houseOfReserve", type: "address" },
    ],
    name: "liquidateUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Core Protocol Addresses
export const XOC_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf";
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // Base Mainnet WETH
export const CBETH_ADDRESS = "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22";
export const HOUSE_OF_RESERVE_WETH = "0xfF69E183A863151B4152055974aa648b3165014D";
export const HOUSE_OF_RESERVE_CBETH = "0x5c4a154690AE52844F151bcF3aA44885db3c8A58";
export const HOUSE_OF_COIN_ADDRESS = "0x02c531Cd9791dD3A31428B2987A82361D72F9b13";
export const ENGINE_ADDRESS = "0x7B6d3eA7A3F7281E3F8Aa619c9E39a433B796428";

// Collateral Parameters
export const WETH_MAX_LTV = 80; // 80%
export const WETH_LIQUIDATION_THRESHOLD = 85; // 85%
export const CBETH_MAX_LTV = 80; // 80%
export const CBETH_LIQUIDATION_THRESHOLD = 85; // 85%

// Contract ABIs
export const XOC_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ENGINE_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "depositCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "mintXoc",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdrawCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "burnXoc",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getCollateralBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getXocBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// WETH ABI (Base Mainnet WETH functions)
export const WETH_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export const CBETH_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Add Alux Protocol addresses
export const ALUX_LENDING_POOL = "0x7a8AE9bB9080670e2BAFb6Df3EA62968F4Ad8a88";

// Add Alux Protocol ABIs
export const ALUX_LENDING_POOL_ABI = [
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interestRateMode", type: "uint256" },
      { name: "referralCode", type: "uint16" },
      { name: "onBehalfOf", type: "address" },
    ],
    name: "borrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interestRateMode", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
    ],
    name: "repay",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
