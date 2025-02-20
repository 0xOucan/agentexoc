import { z } from "zod";

export const TransferXocSchema = z
  .object({
    to: z.string().describe("The destination address to receive XOC tokens. Must be a valid Ethereum address."),
    amount: z.string().describe("The amount of XOC tokens to transfer (in wei). Make sure you have sufficient balance."),
  })
  .strip();

export const ApproveXocSchema = z
  .object({
    spender: z.string().describe("The address to approve spending XOC tokens"),
    amount: z.string().describe("The amount of XOC tokens to approve"),
  })
  .strip();

export const GetXocBalanceSchema = z
  .object({
    address: z.string().describe("The address to check XOC balance for"),
  })
  .strip();

export const HouseOfReserveSchema = z
  .object({
    amount: z.string().describe("The amount of collateral to deposit/withdraw"),
  })
  .strip();

export const HouseOfCoinSchema = z
  .object({
    amount: z.string().describe("The amount of XOC to borrow/repay"),
  })
  .strip();

export const LiquidateSchema = z
  .object({
    account: z.string().describe("The account address to liquidate"),
  })
  .strip();

export const SupplyXocSchema = z
  .object({
    amount: z.string().describe("The amount of XOC to supply"),
    onBehalfOf: z.string().optional().describe("Optional: Address to supply on behalf of"),
  })
  .strip();

export const WithdrawXocSchema = z
  .object({
    amount: z.string().describe("The amount of XOC to withdraw"),
    to: z.string().optional().describe("Optional: Address to withdraw to"),
  })
  .strip();

export const BorrowXocSchema = z
  .object({
    amount: z.string().describe("Amount of XOC to borrow"),
    interestRateMode: z.enum(["1", "2"]).describe("Interest rate mode: 1 for Stable, 2 for Variable"),
  })
  .strip();

export const RepayXocSchema = z
  .object({
    amount: z.string().describe("Amount of XOC to repay"),
    interestRateMode: z.enum(["1", "2"]).describe("Interest rate mode: 1 for Stable, 2 for Variable"),
  })
  .strip();

export const SupplyWethAluxSchema = z
  .object({
    amount: z.string().describe("Amount of WETH to supply as collateral"),
  })
  .strip();
