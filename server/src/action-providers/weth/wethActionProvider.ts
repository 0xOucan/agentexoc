import { ActionProvider } from "@coinbase/agentkit";
import { parseEther, formatEther, type Hash, type Address } from "viem";
import { WETH_ABI, WETH_ADDRESS, DEPOSIT_ABI, WITHDRAW_ABI } from "./constants";
import { WrapEthSchema, UnwrapWethSchema, GetWethBalanceSchema } from "./schemas";
import { InsufficientBalanceError, WrongNetworkError } from "./errors";
import { Network } from "@coinbase/agentkit";
import type { PublicClient, WalletClient } from "viem";

export class WethActionProvider extends ActionProvider {
  name = "weth";
  description = "Handles wrapping and unwrapping of ETH/WETH on Base Mainnet";
  protected client!: PublicClient;
  protected wallet!: WalletClient;
  protected network!: Network;

  constructor() {
    super("weth", []);
  }

  protected validateNetwork() {
    // Always assume we're on mainnet for WETH operations
    return true;
  }

  supportsNetwork = (network: Network): boolean => {
    // Always return true since we're forcing mainnet
    return true;
  };

  protected async getAddress(): Promise<Address> {
    const [address] = await this.wallet.getAddresses();
    return address;
  }

  async wrapEth(args: { amount: string }): Promise<string> {
    const amountWei = parseEther(args.amount);
    const address = await this.getAddress();

    try {
      // Check ETH balance
      const balance = await this.client.getBalance({ address });
      if (balance < amountWei) {
        throw new InsufficientBalanceError(
          formatEther(balance),
          args.amount
        );
      }

      // Wrap ETH to WETH
      const { request } = await this.client.simulateContract({
        address: WETH_ADDRESS,
        abi: DEPOSIT_ABI,
        functionName: "deposit",
        value: amountWei,
        account: address,
      });

      const hash = await this.wallet.writeContract({
        ...request,
        account: address,
      }) as Hash;

      await this.client.waitForTransactionReceipt({ hash });

      // Clean format for transaction link
      return [
        `Successfully wrapped ${args.amount} ETH to WETH`,
        `Transaction: [View on Basescan](https://basescan.org/tx/${hash})`
      ].join('\n');
    } catch (error: unknown) {
      console.error('WETH wrap error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to wrap ETH: ${error.message}`);
      }
      throw new Error(`Failed to wrap ETH: ${String(error)}`);
    }
  }

  async unwrapWeth(args: { amount: string }): Promise<string> {
    try {
      const amountWei = parseEther(args.amount);
      const address = await this.getAddress();

      // First check WETH balance
      const wethBalance = await this.client.readContract({
        address: WETH_ADDRESS,
        abi: WETH_ABI,
        functionName: "balanceOf",
        args: [address],
      }) as bigint;

      if (wethBalance < amountWei) {
        const currentBalance = formatEther(wethBalance);
        return `Insufficient WETH balance. You have ${currentBalance} WETH but trying to unwrap ${args.amount} WETH.`;
      }

      // Unwrap WETH to ETH
      const { request } = await this.client.simulateContract({
        address: WETH_ADDRESS,
        abi: WITHDRAW_ABI,
        functionName: "withdraw",
        args: [amountWei],
        account: address,
      });

      const hash = await this.wallet.writeContract({
        ...request,
        account: address,
      }) as Hash;

      await this.client.waitForTransactionReceipt({ hash });

      return `Successfully unwrapped ${args.amount} WETH to ETH.\nTransaction: [View on Basescan](https://basescan.org/tx/${hash})`;
    } catch (error: unknown) {
      console.error('WETH unwrap error:', error);
      return `Failed to unwrap WETH. Please check your WETH balance with "check weth balance" command.`;
    }
  }

  async getWethBalance(args: { address?: Address }): Promise<string> {
    try {
      const address = args.address || await this.getAddress();

      const balance = await this.client.readContract({
        address: WETH_ADDRESS,
        abi: WETH_ABI,
        functionName: "balanceOf",
        args: [address],
      }) as bigint;

      // Return a clear, formatted balance message
      return `Your WETH Balance: ${formatEther(balance)} WETH`;
    } catch (error) {
      console.error('Error checking WETH balance:', error);
      return 'Failed to check WETH balance. Please try again.';
    }
  }

  actions = {
    wrapEth: {
      schema: WrapEthSchema,
      description: "Wraps ETH into WETH on Base Mainnet",
      examples: [`wrap 0.0001 eth to weth`],
      handler: async (input: any) => {
        return this.wrapEth(input.parameters);
      },
    },

    unwrapWeth: {
      schema: UnwrapWethSchema,
      description: "Unwraps WETH back to ETH on Base Mainnet",
      examples: [`unwrap 0.0001 weth to eth`],
      handler: async (input: any) => {
        // First check WETH balance
        const address = await this.getAddress();
        const wethBalance = await this.client.readContract({
          address: WETH_ADDRESS,
          abi: WETH_ABI,
          functionName: "balanceOf",
          args: [address],
        }) as bigint;

        if (wethBalance === BigInt(0)) {
          return `You don't have any WETH to unwrap. Current balance: 0 WETH`;
        }

        return this.unwrapWeth(input.parameters);
      },
    },

    getWethBalance: {
      schema: GetWethBalanceSchema,
      description: "Gets your WETH balance",
      examples: [`check weth balance`],
      handler: async (input: any) => {
        return this.getWethBalance(input.parameters);
      },
    },
  };
}

export const wethActionProvider = () => new WethActionProvider();