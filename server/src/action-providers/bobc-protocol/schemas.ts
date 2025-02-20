import { z } from "zod";

export const DepositCollateralSchema = z
  .object({
    amount: z.string().describe("The amount of WETH to deposit as collateral"),
  })
  .strip();

export const MintBobcSchema = z
  .object({
    amount: z.string().describe("The amount of BOBC to mint"),
  })
  .strip();

export const DepositAndMintSchema = z
  .object({
    collateralAmount: z.string().describe("The amount of WETH to deposit"),
    mintAmount: z.string().describe("The amount of BOBC to mint"),
  })
  .strip();

export const RedeemCollateralSchema = z
  .object({
    amount: z.string().describe("The amount of collateral to redeem"),
  })
  .strip();

export const BurnBobcSchema = z
  .object({
    amount: z.string().describe("The amount of BOBC to burn"),
  })
  .strip();

export const LiquidateSchema = z
  .object({
    user: z.string().describe("The address of the user to liquidate"),
    debtToCover: z.string().describe("The amount of debt to cover"),
  })
  .strip();

export const GetHealthFactorSchema = z
  .object({
    user: z.string().describe("The address to check the health factor for"),
  })
  .strip();

export const ClaimFaucetSchema = z
  .object({
    amount: z.string().describe("The amount of WETH to claim from faucet"),
  })
  .strip();

export const GetWethBalanceSchema = z
  .object({
    user: z.string().describe("The address to check WETH balance for"),
  })
  .strip();

export const GetBobcBalanceSchema = z
  .object({
    user: z.string().describe("The address to check BOBC balance for"),
  })
  .strip();

export const GetCollateralInfoSchema = z
  .object({
    user: z.string().describe("The address to check collateral information for"),
  })
  .strip();