import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";

import {
  ENGINE_ADDRESS,
  BOBC_ADDRESS,
  WETH_ADDRESS,
  FAUCET_ADDRESS,
  ENGINE_ABI,
  TOKEN_ABI,
  FAUCET_ABI,
} from "./constants";

import {
  DepositCollateralSchema,
  MintBobcSchema,
  DepositAndMintSchema,
  RedeemCollateralSchema,
  BurnBobcSchema,
  LiquidateSchema,
  GetHealthFactorSchema,
  ClaimFaucetSchema,
  GetWethBalanceSchema,
  GetBobcBalanceSchema,
  GetCollateralInfoSchema,
} from "./schemas";

// Add type for contract function results
type ContractFunctionResult = Promise<bigint>;

/**
 * BobcProtocolActionProvider provides actions for interacting with the BOBC Protocol
 * This includes depositing collateral, minting BOBC, liquidations, etc.
 */
export class BobcProtocolActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("bobc-protocol", []);
  }

  @CreateAction({
    name: "claim-weth-faucet",
    description: `
This tool will claim WETH from the faucet on Base Sepolia testnet.
It takes:
- amount: The amount of WETH to claim (in wei)

Important: This is only available on Base Sepolia testnet.
`,
    schema: ClaimFaucetSchema,
  })
  async claimWethFaucet(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ClaimFaucetSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: FAUCET_ABI,
        functionName: "mint",
        args: [await walletProvider.getAddress() as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: FAUCET_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully claimed ${args.amount} WETH from faucet`;
    } catch (error) {
      return `Error claiming WETH: ${error}`;
    }
  }

  @CreateAction({
    name: "deposit-collateral",
    description: `
This tool will deposit WETH as collateral in the BOBC Protocol.
It takes:
- amount: The amount of WETH to deposit (in wei)

Important: 
- You need to approve the engine contract to spend your WETH first
- Make sure you have enough WETH balance
`,
    schema: DepositCollateralSchema,
  })
  async depositCollateral(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositCollateralSchema>,
  ): Promise<string> {
    try {
      // First approve WETH spending
      const approveData = encodeFunctionData({
        abi: TOKEN_ABI,
        functionName: "approve",
        args: [ENGINE_ADDRESS as Hex, BigInt(args.amount)],
      });

      const approveTx = await walletProvider.sendTransaction({
        to: WETH_ADDRESS as Hex,
        data: approveData,
      });

      await walletProvider.waitForTransactionReceipt(approveTx);

      // Then deposit collateral
      const depositData = encodeFunctionData({
        abi: ENGINE_ABI,
        functionName: "deposit_collateral",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: ENGINE_ADDRESS as Hex,
        data: depositData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully deposited ${args.amount} WETH as collateral`;
    } catch (error) {
      return `Error depositing collateral: ${error}`;
    }
  }

  @CreateAction({
    name: "mint-bobc",
    description: `
This tool will mint BOBC stablecoins against your deposited collateral.
It takes:
- amount: The amount of BOBC to mint (in wei)

Important:
- You must have sufficient collateral deposited first
- The system must remain at least 200% overcollateralized
`,
    schema: MintBobcSchema,
  })
  async mintBobc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof MintBobcSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: ENGINE_ABI,
        functionName: "mint_bobc",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: ENGINE_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully minted ${args.amount} BOBC`;
    } catch (error) {
      return `Error minting BOBC: ${error}`;
    }
  }

  @CreateAction({
    name: "deposit-and-mint",
    description: `
This tool will deposit WETH collateral and mint BOBC in one transaction.
It takes:
- collateralAmount: The amount of WETH to deposit (in wei)
- mintAmount: The amount of BOBC to mint (in wei)

Important:
- You need to approve the engine contract to spend your WETH first
- The system must remain at least 200% overcollateralized
`,
    schema: DepositAndMintSchema,
  })
  async depositAndMint(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositAndMintSchema>,
  ): Promise<string> {
    try {
      // First approve WETH spending
      const approveData = encodeFunctionData({
        abi: TOKEN_ABI,
        functionName: "approve",
        args: [ENGINE_ADDRESS as Hex, BigInt(args.collateralAmount)],
      });

      const approveTx = await walletProvider.sendTransaction({
        to: WETH_ADDRESS as Hex,
        data: approveData,
      });

      await walletProvider.waitForTransactionReceipt(approveTx);

      // Then deposit and mint
      const data = encodeFunctionData({
        abi: ENGINE_ABI,
        functionName: "deposit_collateral_and_mint_bobc",
        args: [BigInt(args.collateralAmount), BigInt(args.mintAmount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: ENGINE_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully deposited ${args.collateralAmount} WETH and minted ${args.mintAmount} BOBC`;
    } catch (error) {
      return `Error in deposit and mint: ${error}`;
    }
  }

  @CreateAction({
    name: "redeem-collateral",
    description: `
This tool will redeem WETH collateral from the protocol.
It takes:
- amount: The amount of collateral to redeem (in wei)

Important:
- You must maintain at least 200% collateralization ratio
- You cannot redeem if it would make you undercollateralized
`,
    schema: RedeemCollateralSchema,
  })
  async redeemCollateral(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RedeemCollateralSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: ENGINE_ABI,
        functionName: "redeem_collateral",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: ENGINE_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully redeemed ${args.amount} WETH collateral`;
    } catch (error) {
      return `Error redeeming collateral: ${error}`;
    }
  }

  @CreateAction({
    name: "burn-bobc",
    description: `
This tool will burn BOBC tokens.
It takes:
- amount: The amount of BOBC to burn (in wei)

Important:
- You must have the BOBC tokens to burn
- This will reduce your debt in the system
`,
    schema: BurnBobcSchema,
  })
  async burnBobc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BurnBobcSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: ENGINE_ABI,
        functionName: "burn_bobc",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: ENGINE_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully burned ${args.amount} BOBC`;
    } catch (error) {
      return `Error burning BOBC: ${error}`;
    }
  }

  @CreateAction({
    name: "liquidate",
    description: `
This tool will liquidate an undercollateralized position.
It takes:
- user: The address of the user to liquidate
- debtToCover: The amount of debt to cover (in BOBC)

Important:
- The user must be below the minimum collateralization ratio
- You must have enough BOBC to cover the debt
`,
    schema: LiquidateSchema,
  })
  async liquidate(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof LiquidateSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: ENGINE_ABI,
        functionName: "liquidate",
        args: [args.user as Hex, BigInt(args.debtToCover)],
      });

      const tx = await walletProvider.sendTransaction({
        to: ENGINE_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully liquidated ${args.user} for ${args.debtToCover} BOBC`;
    } catch (error) {
      return `Error liquidating: ${error}`;
    }
  }

  @CreateAction({
    name: "get-health-factor",
    description: `
This tool will check the health factor of an account.
It takes:
- user: The address to check

Returns the health factor (should be >= 1 to avoid liquidation)
`,
    schema: GetHealthFactorSchema,
  })
  async getHealthFactor(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetHealthFactorSchema>,
  ): Promise<string> {
    try {
      const result = await (walletProvider.readContract({
        address: ENGINE_ADDRESS as Hex,
        abi: ENGINE_ABI,
        functionName: "health_factor",
        args: [args.user as Hex],
      }) as ContractFunctionResult);

      return `Health factor for ${args.user}: ${result.toString()}`;
    } catch (error) {
      return `Error getting health factor: ${error}`;
    }
  }

  @CreateAction({
    name: "get-weth-balance",
    description: `
This tool will check the WETH balance of an account.
It takes:
- user: The address to check

Returns the WETH balance in wei.
`,
    schema: GetWethBalanceSchema,
  })
  async getWethBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetWethBalanceSchema>,
  ): Promise<string> {
    try {
      const result = await (walletProvider.readContract({
        address: WETH_ADDRESS as Hex,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [args.user as Hex],
      }) as ContractFunctionResult);

      return `WETH balance for ${args.user}: ${result.toString()} wei`;
    } catch (error) {
      return `Error getting WETH balance: ${error}`;
    }
  }

  @CreateAction({
    name: "get-bobc-balance",
    description: `
This tool will check the BOBC balance of an account.
It takes:
- user: The address to check

Returns the BOBC balance in wei.
`,
    schema: GetBobcBalanceSchema,
  })
  async getBobcBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetBobcBalanceSchema>,
  ): Promise<string> {
    try {
      const result = await (walletProvider.readContract({
        address: BOBC_ADDRESS as Hex,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [args.user as Hex],
      }) as ContractFunctionResult);

      return `BOBC balance for ${args.user}: ${result.toString()} wei`;
    } catch (error) {
      return `Error getting BOBC balance: ${error}`;
    }
  }

  @CreateAction({
    name: "get-collateral-info",
    description: `
This tool will check the collateral information for an account.
It takes:
- user: The address to check

Returns:
- Collateral deposited
- BOBC minted
- Health factor
`,
    schema: GetCollateralInfoSchema,
  })
  async getCollateralInfo(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetCollateralInfoSchema>,
  ): Promise<string> {
    try {
      const [collateral, minted, healthFactor] = await Promise.all([
        walletProvider.readContract({
          address: ENGINE_ADDRESS as Hex,
          abi: ENGINE_ABI,
          functionName: "collateralDeposited",
          args: [args.user as Hex],
        }) as ContractFunctionResult,
        walletProvider.readContract({
          address: ENGINE_ADDRESS as Hex,
          abi: ENGINE_ABI,
          functionName: "bobcMinted",
          args: [args.user as Hex],
        }) as ContractFunctionResult,
        walletProvider.readContract({
          address: ENGINE_ADDRESS as Hex,
          abi: ENGINE_ABI,
          functionName: "health_factor",
          args: [args.user as Hex],
        }) as ContractFunctionResult,
      ]);

      return `
Collateral Information for ${args.user}:
- WETH Deposited: ${collateral.toString()} wei
- BOBC Minted: ${minted.toString()} wei
- Health Factor: ${healthFactor.toString()}
(Health factor should be >= 1 to avoid liquidation)`;
    } catch (error) {
      return `Error getting collateral info: ${error}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const bobcProtocolActionProvider = () => new BobcProtocolActionProvider();