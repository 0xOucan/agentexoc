import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
  Network,
  ViemWalletProvider,
} from "@coinbase/agentkit";

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import { TelegramInterface } from "./telegram-interface";
import "reflect-metadata";
import { xocolatlActionProvider } from "./action-providers/xocolatl";
import { bobcProtocolActionProvider } from "./action-providers/bobc-protocol";
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient } from "viem";

dotenv.config();

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  const requiredVars = [
    "OPENAI_API_KEY",
    "NETWORK_ID",
    "NETWORK_ID_2",
    "WALLET_PRIVATE_KEY"
  ];
  
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Validate network IDs
  const validNetworks = {
    NETWORK_ID: ["base-sepolia"],
    NETWORK_ID_2: ["base-mainnet", "base"] // Allow both forms
  };

  if (!validNetworks.NETWORK_ID.includes(process.env.NETWORK_ID!)) {
    console.error(`Error: NETWORK_ID must be: base-sepolia`);
    process.exit(1);
  }

  if (!validNetworks.NETWORK_ID_2.includes(process.env.NETWORK_ID_2!)) {
    console.error(`Error: NETWORK_ID_2 must be: base-mainnet or base`);
    process.exit(1);
  }

  console.log("Environment validated successfully");
  console.log(`Primary Network (Testnet): ${process.env.NETWORK_ID}`);
  console.log(`Secondary Network (Mainnet): ${process.env.NETWORK_ID_2}`);
}

// Add this right after imports and before any other code
validateEnvironment();

// Add this right after the validateEnvironment() call
console.log("Environment validated successfully");
console.log("Network ID:", process.env.NETWORK_ID || "base-sepolia");

async function selectNetwork(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nSelect network:");
  console.log("1. Base Sepolia (Testnet)");
  console.log("2. Base (Mainnet)");

  const answer = await new Promise<string>((resolve) => {
    rl.question("Enter your choice (1 or 2): ", resolve);
  });
  
  rl.close();

  switch (answer.trim()) {
    case "1":
      return "base-sepolia";
    case "2":
      return "base-mainnet";
    default:
      console.log("Invalid choice, defaulting to Base Sepolia");
      return "base-sepolia";
  }
}

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  try {
    console.log("Initializing agent...");

    const selectedNetwork = await selectNetwork();
    console.log(`Selected network: ${selectedNetwork}`);

    const privateKey = process.env.WALLET_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("Wallet private key not found in environment variables");
    }

    const selectedChain = selectedNetwork === "base-mainnet" ? base : baseSepolia;

    // Create Viem account and client
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const transport = http(selectedChain.rpcUrls.default.http[0], {
      batch: true,
      fetchOptions: {},
      retryCount: 3,
      retryDelay: 100,
      timeout: 30_000,
    });

    const client = createWalletClient({
      account,
      chain: selectedChain,
      transport,
    });

    // Create Viem wallet provider
    const walletProvider = new ViemWalletProvider(client);

    // Debug wallet balance
    const ethBalance = await walletProvider.getBalance();
    console.log(`DEBUG: Raw ETH balance in wei: ${ethBalance.toString()}`);
    console.log(`DEBUG: Formatted ETH balance: ${Number(ethBalance) / 1e18}`);

    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    console.log("LLM initialized");

    // Initialize AgentKit with only Xocolatl for now
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        xocolatlActionProvider(),
        bobcProtocolActionProvider(),
      ],
    });

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "CDP AgentKit Chatbot Example!" },
    };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
        empowered to interact onchain using your tools. 
        
        Current Network: ${selectedNetwork === "base-mainnet" ? "Base Mainnet" : "Base Sepolia Testnet"}
        
        Available Protocols:

        1. Xocolatl (XOC) - Mexican Peso Stablecoin on Base Mainnet:
        Core Features:
        - Transfer and approve XOC tokens
        - Check XOC balances
        - Deposit/withdraw collateral (WETH, CBETH)
        - Mint XOC using collateral
        - Liquidate undercollateralized positions

        Alux Lending Protocol Integration:
        - Supply XOC to earn yield
        - Supply WETH as collateral
        - Borrow XOC against WETH collateral
        - Repay borrowed XOC
        - Withdraw supplied assets

        2. BOBC Protocol - Bolivian Stablecoin on Base Sepolia:
        - Claim WETH from faucet (testnet only)
        - Deposit/withdraw WETH collateral
        - Mint/burn BOBC
        - Monitor health factor
        - Liquidate positions
        - Fixed rate: 1 USD = 7 BOB
        - Minimum 200% collateralization

        Important:
        - Xocolatl only works on Base Mainnet
        - BOBC only works on Base Sepolia
        - Check network before operations
        - Verify balances and allowances
        - Monitor collateral ratios

        Alux Protocol Operations Guide:
        1. To Supply XOC:
           - First approve XOC for Alux (0x7a8AE9bB9080670e2BAFb6Df3EA62968F4Ad8a88)
           - Then supply XOC to earn yield

        2. To Use WETH as Collateral:
           - First approve WETH for Alux
           - Supply WETH as collateral
           - Borrow XOC against your WETH
           - Repay XOC when needed
           - Withdraw WETH when done

        Example Commands:
        XOC Operations:
        - "approve 100 XOC for Alux protocol"
        - "supply 100 XOC to Alux protocol"
        - "withdraw 50 XOC from Alux protocol"

        WETH Operations:
        - "approve 0.1 WETH for Alux protocol"
        - "supply 0.1 WETH as collateral to Alux"
        - "borrow 50 XOC from Alux with variable rate"
        - "repay 50 XOC to Alux with variable rate"
        - "withdraw 0.1 WETH from Alux protocol"

        Get the wallet details first to see what network you're on and what tokens are available.
      `,
    });

    console.log("Agent initialization complete");
    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Run the agent autonomously with specified intervals
 */
async function runAutonomousMode(agent: any, config: any, interval = 10) {
  console.log("Starting autonomous mode...");

  while (true) {
    try {
      const thought =
        "Be creative and do something interesting on the blockchain. " +
        "Choose an action or set of actions and execute it that highlights your abilities.";

      const stream = await agent.stream(
        { messages: [new HumanMessage(thought)] },
        config,
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }

      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

/**
 * Run the agent interactively based on user input
 */
async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const stream = await agent.stream(
        { messages: [new HumanMessage(userInput)] },
        config,
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Run the Telegram interface mode
 */
async function runTelegramMode(agent: any, config: any) {
  console.log("Starting Telegram mode... Waiting for /start command");

  return new Promise<void>((resolve) => {
    const telegram = new TelegramInterface(agent, config, {
      onExit: () => {
        console.log("Exiting Telegram mode...");
        resolve();
      },
      onKill: () => {
        console.log("Kill command received. Shutting down...");
        process.exit(0);
      },
    });
  });
}

/**
 * Choose whether to run in autonomous, chat, or telegram mode
 */
async function chooseMode(): Promise<"chat" | "auto" | "telegram"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat      - Interactive chat mode");
    console.log("2. telegram  - Telegram bot mode");
    console.log("3. auto      - Autonomous action mode");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    rl.close();

    if (choice === "1" || choice === "chat") {
      return "chat";
    } else if (choice === "2" || choice === "telegram") {
      return "telegram";
    } else if (choice === "3" || choice === "auto") {
      return "auto";
    }
    console.log("Invalid choice. Please try again.");
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log("Starting initialization...");
    const { agent, config } = await initializeAgent();
    console.log("Agent initialized successfully");

    while (true) {
      const mode = await chooseMode();
      console.log(`Selected mode: ${mode}`);

      if (mode === "chat") {
        await runChatMode(agent, config);
      } else if (mode === "telegram") {
        await runTelegramMode(agent, config);
      } else {
        await runAutonomousMode(agent, config);
      }

      // After any mode exits, we'll loop back to mode selection
      console.log("\nReturning to mode selection...");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Fatal error:", error.message);
    }
    process.exit(1);
  }
}

main();
