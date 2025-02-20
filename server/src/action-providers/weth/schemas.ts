import { z } from "zod";

export const WrapEthSchema = z
  .object({
    amount: z.string().describe("The exact amount of ETH to wrap into WETH (e.g., '0.0001')"),
  })
  .strip()
  .describe("Wrap ETH to WETH on Base Mainnet");

export const UnwrapWethSchema = z
  .object({
    amount: z.string().describe("The exact amount of WETH to unwrap back to ETH (e.g., '0.0001')"),
  })
  .strip()
  .describe("Unwrap WETH back to ETH on Base Mainnet");

export const GetWethBalanceSchema = z
  .object({
    address: z.string().describe("The address to check WETH balance for"),
  })
  .strip()
  .describe("Get WETH balance for an address on Base Mainnet");
