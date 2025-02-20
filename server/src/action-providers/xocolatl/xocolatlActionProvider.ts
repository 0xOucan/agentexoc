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
  TransferXocSchema,
  ApproveXocSchema,
  GetXocBalanceSchema,
  HouseOfReserveSchema,
  HouseOfCoinSchema,
  LiquidateSchema,
  SupplyXocSchema,
  WithdrawXocSchema,
  SupplyWethAluxSchema,
  BorrowXocSchema,
  RepayXocSchema,
} from "./schemas";
import {
  XOCOLATL_ADDRESS,
  XOCOLATL_ABI,
  HOUSE_OF_RESERVE_ADDRESS,
  HOUSE_OF_RESERVE_ABI,
  HOUSE_OF_COIN_ADDRESS,
  HOUSE_OF_COIN_ABI,
  ACCOUNT_LIQUIDATOR_ADDRESS,
  LIQUIDATOR_ABI,
  WETH_ADDRESS,
  WETH_ABI,
  HOUSE_OF_RESERVE_WETH,
  WETH_MAX_LTV,
  WETH_LIQUIDATION_THRESHOLD,
  CBETH_ADDRESS,
  CBETH_MAX_LTV,
  CBETH_LIQUIDATION_THRESHOLD,
  CBETH_ABI,
  HOUSE_OF_RESERVE_CBETH,
  ALUX_LENDING_POOL,
  ALUX_LENDING_POOL_ABI,
} from "./constants";
import { 
  XocolatlError, 
  InsufficientBalanceError,
  InsufficientAllowanceError,
  UndercollateralizedError 
} from './errors';

const DEPOSIT_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * XocolatlActionProvider provides actions for interacting with LA DAO's Xocolatl ($XOC) token
 */
export class XocolatlActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("xocolatl", []);
  }

  private async checkNetwork(walletProvider: EvmWalletProvider): Promise<void> {
    const network = await walletProvider.getNetwork();
    if (network.networkId !== "base-mainnet") {
      throw new XocolatlError(
        "Xocolatl protocol only works on Base Mainnet. Please switch your network to Base Mainnet."
      );
    }
  }

  private async checkBalance(walletProvider: EvmWalletProvider, amount: string): Promise<void> {
    const address = await walletProvider.getAddress();
    const balance = await walletProvider.readContract({
      address: XOCOLATL_ADDRESS as Hex,
      abi: XOCOLATL_ABI,
      functionName: "balanceOf",
      args: [address],
    }) as bigint;

    if (balance < BigInt(amount)) {
      throw new InsufficientBalanceError(balance.toString(), amount);
    }
  }

  private async checkAllowance(
    walletProvider: EvmWalletProvider, 
    spender: string, 
    amount: string
  ): Promise<void> {
    const address = await walletProvider.getAddress();
    const allowance = await walletProvider.readContract({
      address: XOCOLATL_ADDRESS as Hex,
      abi: XOCOLATL_ABI,
      functionName: "allowance",
      args: [address, spender as Hex],
    }) as bigint;

    if (allowance < BigInt(amount)) {
      throw new InsufficientAllowanceError(allowance.toString(), amount);
    }
  }

  private async checkWethBalance(walletProvider: EvmWalletProvider, amount: string): Promise<void> {
    const address = await walletProvider.getAddress();
    const balance = await walletProvider.readContract({
      address: WETH_ADDRESS as Hex,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [address],
    }) as bigint;

    if (balance < BigInt(amount)) {
      throw new InsufficientBalanceError(
        `${balance.toString()} WETH`, 
        `${amount} WETH`
      );
    }
  }

  private async checkWethAllowance(
    walletProvider: EvmWalletProvider,
    spender: string,
    amount: string
  ): Promise<void> {
    const address = await walletProvider.getAddress();
    const allowance = await walletProvider.readContract({
      address: WETH_ADDRESS as Hex,
      abi: WETH_ABI,
      functionName: "allowance",
      args: [address, spender as Hex],
    }) as bigint;

    if (allowance < BigInt(amount)) {
      throw new InsufficientAllowanceError(
        `${allowance.toString()} WETH`,
        `${amount} WETH`
      );
    }
  }

  private async checkCbethBalance(walletProvider: EvmWalletProvider, amount: string): Promise<void> {
    const address = await walletProvider.getAddress();
    const balance = await walletProvider.readContract({
      address: CBETH_ADDRESS as Hex,
      abi: CBETH_ABI,
      functionName: "balanceOf",
      args: [address],
    }) as bigint;

    if (balance < BigInt(amount)) {
      throw new InsufficientBalanceError(
        `${balance.toString()} CBETH`, 
        `${amount} CBETH`
      );
    }
  }

  private async checkCbethAllowance(
    walletProvider: EvmWalletProvider,
    spender: string,
    amount: string
  ): Promise<void> {
    const address = await walletProvider.getAddress();
    const allowance = await walletProvider.readContract({
      address: CBETH_ADDRESS as Hex,
      abi: CBETH_ABI,
      functionName: "allowance",
      args: [address, spender as Hex],
    }) as bigint;

    if (allowance < BigInt(amount)) {
      throw new InsufficientAllowanceError(
        `${allowance.toString()} CBETH`,
        `${amount} CBETH`
      );
    }
  }

  private async checkCollateralBalance(walletProvider: EvmWalletProvider): Promise<bigint> {
    const address = await walletProvider.getAddress();
    const balance = await walletProvider.readContract({
      address: HOUSE_OF_RESERVE_ADDRESS as Hex,
      abi: HOUSE_OF_RESERVE_ABI,
      functionName: "getCollateralBalance",
      args: [address],
    }) as bigint;
    return balance;
  }

  private async checkCollateralizationRatio(
    walletProvider: EvmWalletProvider,
    mintAmount: string
  ): Promise<void> {
    const collateralBalance = await this.checkCollateralBalance(walletProvider);
    
    // Get WETH price from House of Reserve
    const wethPrice = await walletProvider.readContract({
      address: HOUSE_OF_RESERVE_ADDRESS as Hex,
      abi: HOUSE_OF_RESERVE_ABI,
      functionName: "getCollateralPrice",
      args: [],
    }) as bigint;

    // Calculate collateral value and required collateral
    const collateralValue = (collateralBalance * wethPrice) / BigInt(1e18);
    const requiredCollateral = (BigInt(mintAmount) * BigInt(150)) / BigInt(100); // 150% collateralization ratio

    if (collateralValue < requiredCollateral) {
      throw new UndercollateralizedError(
        ((collateralValue * BigInt(100)) / BigInt(mintAmount)).toString(),
        "150"
      );
    }
  }

  private async getCollateralParameters(collateralType: 'WETH' | 'CBETH'): Promise<{
    address: string;
    houseOfReserve: string;
    maxLtv: number;
    liquidationThreshold: number;
  }> {
    switch (collateralType) {
      case 'WETH':
        return {
          address: WETH_ADDRESS,
          houseOfReserve: HOUSE_OF_RESERVE_WETH,
          maxLtv: WETH_MAX_LTV,
          liquidationThreshold: WETH_LIQUIDATION_THRESHOLD,
        };
      case 'CBETH':
        return {
          address: CBETH_ADDRESS,
          houseOfReserve: HOUSE_OF_RESERVE_CBETH,
          maxLtv: CBETH_MAX_LTV,
          liquidationThreshold: CBETH_LIQUIDATION_THRESHOLD,
        };
      default:
        throw new Error('Unsupported collateral type');
    }
  }

  private async depositCollateral(
    walletProvider: EvmWalletProvider,
    collateralType: 'WETH' | 'CBETH',
    amount: string
  ): Promise<string> {
    const params = await this.getCollateralParameters(collateralType);

    // Check balance first
    if (collateralType === 'WETH') {
      await this.checkWethBalance(walletProvider, amount);
    } else {
      await this.checkCbethBalance(walletProvider, amount);
    }

    // Check allowance first
    const address = await walletProvider.getAddress();
    const allowance = await walletProvider.readContract({
      address: params.address as Hex,
      abi: collateralType === 'WETH' ? WETH_ABI : CBETH_ABI,
      functionName: "allowance",
      args: [address, params.houseOfReserve as Hex],
    }) as bigint;

    // Approve if needed
    if (allowance < BigInt(amount)) {
      const approveData = encodeFunctionData({
        abi: collateralType === 'WETH' ? WETH_ABI : CBETH_ABI,
        functionName: "approve",
        args: [params.houseOfReserve as Hex, BigInt(amount)],
      });

      const approveTx = await walletProvider.sendTransaction({
        to: params.address as Hex,
        data: approveData,
      });

      await walletProvider.waitForTransactionReceipt(approveTx);
      console.log(`Approved ${collateralType} spending for House of Reserve`);
    }

    // Deposit collateral
    const depositData = encodeFunctionData({
      abi: DEPOSIT_ABI,
      functionName: "deposit",
      args: [BigInt(amount)],
    });

    const tx = await walletProvider.sendTransaction({
      to: params.houseOfReserve as Hex,
      data: depositData,
    });

    await walletProvider.waitForTransactionReceipt(tx);
    return `Successfully deposited ${amount} ${collateralType} as collateral\nTransaction: ${this.getBasescanLink(tx)}`;
  }

  private getBasescanLink(txHash: string): string {
    return `https://basescan.org/tx/${txHash}`;
  }

  private async getWethBalance(walletProvider: EvmWalletProvider): Promise<bigint> {
    const address = await walletProvider.getAddress();
    return await walletProvider.readContract({
      address: WETH_ADDRESS as Hex,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [address],
    }) as bigint;
  }

  private async checkAndApproveXoc(
    walletProvider: EvmWalletProvider,
    spender: string,
    amount: string
  ): Promise<string | null> {
    const address = await walletProvider.getAddress();
    
    // Check current allowance
    const allowance = await walletProvider.readContract({
      address: XOCOLATL_ADDRESS as Hex,
      abi: XOCOLATL_ABI,
      functionName: "allowance",
      args: [address, spender as Hex],
    }) as bigint;

    // If allowance is insufficient, approve
    if (allowance < BigInt(amount)) {
      const approveData = encodeFunctionData({
        abi: XOCOLATL_ABI,
        functionName: "approve",
        args: [spender as Hex, BigInt(amount)],
      });

      const approveTx = await walletProvider.sendTransaction({
        to: XOCOLATL_ADDRESS as Hex,
        data: approveData,
      });

      await walletProvider.waitForTransactionReceipt(approveTx);
      return approveTx;
    }

    return null; // No approval needed
  }

  @CreateAction({
    name: "transfer-xoc",
    description: `
This tool will transfer XOC tokens to another address onchain.
NOTE: Only works on Base Mainnet
It takes:
- to: The destination address that will receive the XOC tokens
- amount: The amount of XOC tokens to transfer (in wei)

The tool will return a success message with the transaction details or an error message if the transfer fails.
`,
    schema: TransferXocSchema,
  })
  async transferXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof TransferXocSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      await this.checkBalance(walletProvider, args.amount);

      const data = encodeFunctionData({
        abi: XOCOLATL_ABI,
        functionName: "transfer",
        args: [args.to as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: XOCOLATL_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully transferred ${args.amount} XOC to ${args.to}\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof XocolatlError) {
        return `Error: ${error.message}`;
      }
      if (error instanceof Error) {
        // Handle specific contract errors
        if (error.message.includes("execution reverted")) {
          return "Transaction failed: The contract rejected the transaction. This could be due to insufficient funds or contract restrictions.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "approve-xoc",
    description: `
This tool will approve another address to spend XOC tokens on behalf of the user.
It takes:
- spender: The address to approve for spending XOC tokens
- amount: The amount of XOC tokens to approve (in wei)

Important: This is required before any contract can transfer XOC tokens on your behalf.
`,
    schema: ApproveXocSchema,
  })
  async approveXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveXocSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: XOCOLATL_ABI,
        functionName: "approve",
        args: [args.spender as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: XOCOLATL_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully approved ${args.amount} XOC for ${args.spender}\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      return `Error approving XOC: ${error}`;
    }
  }

  @CreateAction({
    name: "get-xoc-balance",
    description: `
This tool will check the XOC token balance of an address.
It takes:
- address: The address to check the balance for

Returns the balance in wei.
`,
    schema: GetXocBalanceSchema,
  })
  async getXocBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetXocBalanceSchema>,
  ): Promise<string> {
    try {
      const balance = await walletProvider.readContract({
        address: XOCOLATL_ADDRESS as Hex,
        abi: XOCOLATL_ABI,
        functionName: "balanceOf",
        args: [args.address as Hex],
      }) as bigint;

      return `XOC Balance: ${balance.toString()}`;
    } catch (error) {
      return `Error getting XOC balance: ${error}`;
    }
  }

  @CreateAction({
    name: "deposit-reserve",
    description: `
This tool will deposit collateral into the House of Reserve.
It takes:
- amount: The amount of collateral to deposit (in wei)

Important: You need to approve the House of Reserve first.
`,
    schema: HouseOfReserveSchema,
  })
  async depositReserve(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfReserveSchema>,
  ): Promise<string> {
    try {
      // Check allowance first
      await this.checkAllowance(walletProvider, HOUSE_OF_RESERVE_ADDRESS, args.amount);

      const data = encodeFunctionData({
        abi: HOUSE_OF_RESERVE_ABI,
        functionName: "deposit",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_RESERVE_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully deposited ${args.amount} collateral\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof XocolatlError) {
        return `Error: ${error.message}`;
      }
      if (error instanceof Error) {
        if (error.message.includes("insufficient allowance")) {
          return "Error: You need to approve the House of Reserve to spend your tokens first. Use the approve-xoc action.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "withdraw-reserve",
    description: `
This tool will withdraw collateral from the House of Reserve.
It takes:
- amount: The amount of collateral to withdraw (in wei)
`,
    schema: HouseOfReserveSchema,
  })
  async withdrawReserve(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfReserveSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: HOUSE_OF_RESERVE_ABI,
        functionName: "withdraw",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_RESERVE_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully withdrew ${args.amount} collateral\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      return `Error withdrawing collateral: ${error}`;
    }
  }

  @CreateAction({
    name: "mint-coin",
    description: `
This tool will mint XOC tokens using your collateral.
It takes:
- amount: The amount of XOC to mint (in wei)
`,
    schema: HouseOfCoinSchema,
  })
  async mintCoin(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfCoinSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: HOUSE_OF_COIN_ABI,
        functionName: "mintCoin",
        args: [XOCOLATL_ADDRESS as Hex, HOUSE_OF_RESERVE_ADDRESS as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_COIN_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully minted ${args.amount} XOC\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      return `Error minting XOC: ${error}`;
    }
  }

  @CreateAction({
    name: "liquidate-account",
    description: `
This tool will liquidate an undercollateralized account.
It takes:
- account: The address of the account to liquidate
`,
    schema: LiquidateSchema,
  })
  async liquidateAccount(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof LiquidateSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: LIQUIDATOR_ABI,
        functionName: "liquidateUser",
        args: [args.account as Hex, HOUSE_OF_RESERVE_ADDRESS as Hex],
      });

      const tx = await walletProvider.sendTransaction({
        to: ACCOUNT_LIQUIDATOR_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully liquidated account ${args.account}\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      return `Error liquidating account: ${error}`;
    }
  }

  @CreateAction({
    name: "deposit-weth-collateral",
    description: `
Deposit WETH as collateral into the Xocolatl protocol.
Steps:
1. Approves WETH spending for House of Reserve
2. Deposits WETH into House of Reserve

Parameters:
- amount: Amount of WETH to deposit (in wei)

Example: To deposit 0.0001 WETH, use amount: "100000000000000"
`,
    schema: HouseOfReserveSchema,
  })
  async depositWethCollateral(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfReserveSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      // First approve WETH spending
      const approveData = encodeFunctionData({
        abi: WETH_ABI,
        functionName: "approve",
        args: [HOUSE_OF_RESERVE_WETH as Hex, BigInt(args.amount)],
      });

      const approveTx = await walletProvider.sendTransaction({
        to: WETH_ADDRESS as Hex,
        data: approveData,
      });

      await walletProvider.waitForTransactionReceipt(approveTx);
      console.log(`Approved WETH spending. Tx: ${this.getBasescanLink(approveTx)}`);

      // Then deposit into House of Reserve
      const depositData = encodeFunctionData({
        abi: DEPOSIT_ABI,
        functionName: "deposit",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_RESERVE_WETH as Hex,
        data: depositData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully deposited ${args.amount} WETH as collateral\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("execution reverted")) {
          return "Transaction failed. Please check your WETH balance and try again.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "wrap-eth",
    description: `
Wrap ETH to WETH.
Parameters:
- amount: Amount of ETH to wrap (in wei)

Example: To wrap 0.0001 ETH, use amount: "100000000000000"
`,
    schema: HouseOfReserveSchema,
  })
  async wrapEth(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfReserveSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      const tx = await walletProvider.sendTransaction({
        to: WETH_ADDRESS as Hex,
        value: BigInt(args.amount),
        data: encodeFunctionData({
          abi: WETH_ABI,
          functionName: "deposit",
        }),
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully wrapped ${args.amount} ETH to WETH\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      return `Error wrapping ETH: ${error}`;
    }
  }

  @CreateAction({
    name: "mint-xoc",
    description: `
Mint XOC tokens using your WETH collateral.
Steps:
1. Mints XOC tokens against your WETH collateral

Parameters:
- amount: Amount of XOC to mint (in wei)

Example: To mint 1 XOC, use amount: "1000000000000000000"
`,
    schema: HouseOfCoinSchema,
  })
  async mintXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfCoinSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      const mintData = encodeFunctionData({
        abi: HOUSE_OF_COIN_ABI,
        functionName: "mintCoin",
        args: [
          WETH_ADDRESS as Hex,
          HOUSE_OF_RESERVE_WETH as Hex,
          BigInt(args.amount),
        ],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_COIN_ADDRESS as Hex,
        data: mintData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully minted ${args.amount} XOC\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("insufficient collateral")) {
          return "Error: Insufficient collateral. Please deposit more WETH before minting.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "get-collateral-info",
    description: `
This tool will get your collateral information from the Xocolatl protocol.
Returns:
- WETH collateral balance
- Current collateralization ratio
- Maximum XOC that can be minted
`,
    schema: GetXocBalanceSchema,
  })
  async getCollateralInfo(
    walletProvider: EvmWalletProvider,
    collateralType: 'WETH' | 'CBETH'
  ): Promise<{
    balance: bigint;
    price: bigint;
    maxMintable: bigint;
  }> {
    const params = await this.getCollateralParameters(collateralType);
    const address = await walletProvider.getAddress();

    // Get collateral balance
    const balance = await walletProvider.readContract({
      address: params.houseOfReserve as Hex,
      abi: HOUSE_OF_RESERVE_ABI,
      functionName: "getCollateralBalance",
      args: [address],
    }) as bigint;

    // Get collateral price
    const price = await walletProvider.readContract({
      address: params.houseOfReserve as Hex,
      abi: HOUSE_OF_RESERVE_ABI,
      functionName: "getCollateralPrice",
      args: [],
    }) as bigint;

    // Calculate max mintable based on LTV
    const collateralValue = (balance * price) / BigInt(1e18);
    const maxMintable = (collateralValue * BigInt(params.maxLtv)) / BigInt(100);

    return { balance, price, maxMintable };
  }

  @CreateAction({
    name: "get-all-collateral-info",
    description: `
Get information about all your collateral positions in the Xocolatl protocol.
Returns:
- WETH and CBETH balances
- Current prices
- Maximum mintable XOC for each collateral type
- Liquidation thresholds
`,
    schema: z.object({}),
  })
  async getAllCollateralInfo(
    walletProvider: EvmWalletProvider,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      const wethInfo = await this.getCollateralInfo(walletProvider, 'WETH');
      const cbethInfo = await this.getCollateralInfo(walletProvider, 'CBETH');

      return `Collateral Information:

WETH Position:
- Balance: ${wethInfo.balance.toString()} WETH
- Current Price: ${wethInfo.price.toString()} USD/WETH
- Max Mintable XOC: ${wethInfo.maxMintable.toString()} XOC
- Liquidation Threshold: ${WETH_LIQUIDATION_THRESHOLD}%

CBETH Position:
- Balance: ${cbethInfo.balance.toString()} CBETH
- Current Price: ${cbethInfo.price.toString()} USD/CBETH
- Max Mintable XOC: ${cbethInfo.maxMintable.toString()} XOC
- Liquidation Threshold: ${CBETH_LIQUIDATION_THRESHOLD}%
`;
    } catch (error) {
      if (error instanceof XocolatlError) {
        return `Error: ${error.message}`;
      }
      return `Error getting collateral info: ${error}`;
    }
  }

  @CreateAction({
    name: "mint-xoc-with-collateral",
    description: `
Mint XOC tokens using your deposited collateral.
Steps:
1. Checks collateral balance and value
2. Verifies collateralization ratio (minimum 150%)
3. Mints XOC tokens

Parameters:
- collateralType: "WETH" or "CBETH"
- amount: Amount of XOC to mint (in wei)

Important:
- WETH has 80% max LTV and 85% liquidation threshold
- CBETH has 80% max LTV and 85% liquidation threshold
- Maintain safe collateral ratio to avoid liquidation
`,
    schema: z.object({
      collateralType: z.enum(["WETH", "CBETH"]),
      amount: z.string(),
    }),
  })
  async mintXocWithCollateral(
    walletProvider: EvmWalletProvider,
    args: { collateralType: 'WETH' | 'CBETH'; amount: string },
  ): Promise<string> {
    try {
      const params = await this.getCollateralParameters(args.collateralType);
      
      // Mint XOC
      const mintData = encodeFunctionData({
        abi: HOUSE_OF_COIN_ABI,
        functionName: "mintCoin",
        args: [
          params.address as Hex,
          params.houseOfReserve as Hex,
          BigInt(args.amount),
        ],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_COIN_ADDRESS as Hex,
        data: mintData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully minted ${args.amount} XOC using ${args.collateralType} as collateral\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("insufficient collateral")) {
          return `Error: Insufficient ${args.collateralType} collateral. Please deposit more before minting.`;
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "withdraw-weth",
    description: `
Withdraw WETH collateral from the House of Reserve.
Parameters:
- amount: Amount of WETH to withdraw (in wei)

Example: To withdraw 0.0001 WETH, use amount: "100000000000000"
`,
    schema: HouseOfReserveSchema,
  })
  async withdrawWeth(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfReserveSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      const withdrawData = encodeFunctionData({
        abi: HOUSE_OF_RESERVE_ABI,
        functionName: "withdraw",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_RESERVE_WETH as Hex,
        data: withdrawData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully withdrew ${args.amount} WETH\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("execution reverted")) {
          return "Transaction failed. Please check your collateral balance and try again.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "approve-weth-collateral",
    description: `
Approve WETH to be used as collateral in the Xocolatl protocol.
Parameters:
- amount: Amount of WETH to approve (in wei)

Example: To approve 0.0001 WETH, use amount: "100000000000000"
`,
    schema: HouseOfReserveSchema,
  })
  async approveWethCollateral(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfReserveSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      // Check WETH balance first
      const address = await walletProvider.getAddress();
      const balance = await walletProvider.readContract({
        address: WETH_ADDRESS as Hex,
        abi: WETH_ABI,
        functionName: "balanceOf",
        args: [address],
      }) as bigint;

      if (balance < BigInt(args.amount)) {
        return `Error: Insufficient WETH balance. You have ${balance.toString()} WETH but trying to approve ${args.amount} WETH`;
      }

      // Approve WETH spending
      const approveData = encodeFunctionData({
        abi: WETH_ABI,
        functionName: "approve",
        args: [HOUSE_OF_RESERVE_WETH as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: WETH_ADDRESS as Hex,
        data: approveData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully approved ${args.amount} WETH for Xocolatl protocol\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("execution reverted")) {
          return "Transaction failed. Please check your WETH balance and try again.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "approve-xoc-alux",
    description: `
Approve XOC tokens for Alux lending protocol.
Parameters:
- amount: Amount of XOC to approve (in wei)

Example: To approve 1 XOC, use amount: "1000000000000000000"
`,
    schema: ApproveXocSchema,
  })
  async approveXocAlux(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveXocSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      await this.checkBalance(walletProvider, args.amount);

      const approveData = encodeFunctionData({
        abi: XOCOLATL_ABI,
        functionName: "approve",
        args: [ALUX_LENDING_POOL as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: XOCOLATL_ADDRESS as Hex,
        data: approveData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully approved ${args.amount} XOC for Alux protocol\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("execution reverted")) {
          return "Transaction failed. Please check your XOC balance and try again.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "supply-xoc-alux",
    description: `
Supply XOC tokens to the Alux lending protocol.
Steps:
1. Checks XOC balance
2. Supplies XOC to the lending pool

Parameters:
- amount: Amount of XOC to supply (in wei)

Example: To supply 2 XOC, use amount: "2000000000000000000"
`,
    schema: SupplyXocSchema,
  })
  async supplyXocAlux(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplyXocSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      await this.checkBalance(walletProvider, args.amount);

      const address = await walletProvider.getAddress();

      // Supply to Alux
      const supplyData = encodeFunctionData({
        abi: ALUX_LENDING_POOL_ABI,
        functionName: "supply",
        args: [
          XOCOLATL_ADDRESS as Hex,
          BigInt(args.amount),
          address as Hex,
          0, // referralCode
        ],
      });

      const tx = await walletProvider.sendTransaction({
        to: ALUX_LENDING_POOL as Hex,
        data: supplyData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully supplied ${args.amount} XOC to Alux protocol\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("execution reverted")) {
          return "Transaction failed. Please check your XOC balance and try again.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "withdraw-xoc",
    description: `
Withdraw XOC tokens from the Alux lending protocol.
Parameters:
- amount: Amount of XOC to withdraw (in wei)
- to: (Optional) Address to withdraw to

Example: To withdraw 1 XOC, use amount: "1000000000000000000"
`,
    schema: WithdrawXocSchema,
  })
  async withdrawXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WithdrawXocSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      const address = await walletProvider.getAddress();
      const withdrawData = encodeFunctionData({
        abi: ALUX_LENDING_POOL_ABI,
        functionName: "withdraw",
        args: [
          XOCOLATL_ADDRESS as Hex,
          BigInt(args.amount),
          (args.to || address) as Hex,
        ],
      });

      const tx = await walletProvider.sendTransaction({
        to: ALUX_LENDING_POOL as Hex,
        data: withdrawData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully withdrew ${args.amount} XOC from Alux protocol\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("execution reverted")) {
          return "Transaction failed. Please check your supplied balance and try again.";
        }
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "supply-weth-alux",
    description: `
Supply WETH as collateral to Alux lending protocol.
Steps:
1. Approves WETH spending
2. Supplies WETH as collateral

Parameters:
- amount: Amount of WETH to supply (in wei)

Example: To supply 0.0001 WETH, use amount: "100000000000000"
`,
    schema: SupplyWethAluxSchema,
  })
  async supplyWethAlux(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplyWethAluxSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      const address = await walletProvider.getAddress();

      // First approve WETH
      const approveData = encodeFunctionData({
        abi: WETH_ABI,
        functionName: "approve",
        args: [ALUX_LENDING_POOL as Hex, BigInt(args.amount)],
      });

      const approveTx = await walletProvider.sendTransaction({
        to: WETH_ADDRESS as Hex,
        data: approveData,
      });

      await walletProvider.waitForTransactionReceipt(approveTx);
      console.log(`Approved WETH spending. Tx: ${this.getBasescanLink(approveTx)}`);

      // Then supply WETH
      const supplyData = encodeFunctionData({
        abi: ALUX_LENDING_POOL_ABI,
        functionName: "supply",
        args: [
          WETH_ADDRESS as Hex,
          BigInt(args.amount),
          address as Hex,
          0, // referralCode
        ],
      });

      const tx = await walletProvider.sendTransaction({
        to: ALUX_LENDING_POOL as Hex,
        data: supplyData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully supplied ${args.amount} WETH as collateral\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "borrow-xoc-alux",
    description: `
Borrow XOC from Alux lending protocol.
Parameters:
- amount: Amount of XOC to borrow (in wei)
- interestRateMode: "1" for Stable, "2" for Variable

Example: To borrow 1 XOC with variable rate:
amount: "1000000000000000000", interestRateMode: "2"
`,
    schema: BorrowXocSchema,
  })
  async borrowXocAlux(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BorrowXocSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      const address = await walletProvider.getAddress();

      const borrowData = encodeFunctionData({
        abi: ALUX_LENDING_POOL_ABI,
        functionName: "borrow",
        args: [
          XOCOLATL_ADDRESS as Hex,
          BigInt(args.amount),
          BigInt(args.interestRateMode),
          0, // referralCode
          address as Hex,
        ],
      });

      const tx = await walletProvider.sendTransaction({
        to: ALUX_LENDING_POOL as Hex,
        data: borrowData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully borrowed ${args.amount} XOC\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "repay-xoc-alux",
    description: `
Repay borrowed XOC to Alux lending protocol.
Parameters:
- amount: Amount of XOC to repay (in wei)
- interestRateMode: "1" for Stable, "2" for Variable

Example: To repay 1 XOC for variable rate loan:
amount: "1000000000000000000", interestRateMode: "2"
`,
    schema: RepayXocSchema,
  })
  async repayXocAlux(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RepayXocSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      const address = await walletProvider.getAddress();

      const repayData = encodeFunctionData({
        abi: ALUX_LENDING_POOL_ABI,
        functionName: "repay",
        args: [
          XOCOLATL_ADDRESS as Hex,
          BigInt(args.amount),
          BigInt(args.interestRateMode),
          address as Hex,
        ],
      });

      const tx = await walletProvider.sendTransaction({
        to: ALUX_LENDING_POOL as Hex,
        data: repayData,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully repaid ${args.amount} XOC\nTransaction: ${this.getBasescanLink(tx)}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const xocolatlActionProvider = () => new XocolatlActionProvider();
