import { formatEther } from 'viem';
import { HumanMessage } from "@langchain/core/messages";
import { setTimeout } from 'timers/promises';

export const REQUIRED_BALANCE = BigInt('200000000000000'); // 0.0002 ETH
export const DEMO_AMOUNT_ETH = '0.0001';
export const DEMO_AMOUNT_XOC = '0.05';
export const DELAY = 15000; // 15 seconds

export const ALUX_DEMO_STEPS = [
  `wrap ${DEMO_AMOUNT_ETH} eth to weth`,
  `approve ${DEMO_AMOUNT_ETH} weth in the alux protocol`,
  `supply ${DEMO_AMOUNT_ETH} weth as collateral in the alux protocol`,
  `borrow ${DEMO_AMOUNT_XOC} xoc in the alux protocol`,
  `approve ${DEMO_AMOUNT_XOC} xoc in the alux protocol`,
  `repay ${DEMO_AMOUNT_XOC} xoc in the alux protocol`,
  `withdraw ${DEMO_AMOUNT_ETH} weth from alux protocol`
];

export const XOCOLATL_DEMO_STEPS = [
  `approve ${DEMO_AMOUNT_ETH} weth in the xocolatl protocol`,
  `supply ${DEMO_AMOUNT_ETH} weth as collateral in xocolatl`,
  `mint ${DEMO_AMOUNT_XOC} xoc`
];

export async function extractBalance(response: string): Promise<bigint> {
  try {
    const matches = response.match(/(?:Native Balance:|ETH Balance:)\s*([\d.]+)/i);
    if (!matches) {
      throw new Error("Could not find balance in response");
    }
    return BigInt(Math.floor(parseFloat(matches[1]) * 1e18));
  } catch (error) {
    console.error("Error extracting balance:", error);
    return BigInt(0);
  }
}

export interface DemoCallback {
  (message: string, isUser: boolean): Promise<void>;
}

export function formatTransactionLink(tx: string): string {
  return tx.replace(
    /(?:Transaction:|transaction hash:|hash:)\s*(\b0x[a-f0-9]{64}\b)/gi,
    (_, hash) => `\nTransaction: [View on Basescan](https://basescan.org/tx/${hash})`
  ).trim();
}

// Add a delay between messages to make them more readable
const MESSAGE_DELAY = 1000; // 1 second

export async function runDemoSequence(
  agent: any,
  config: any,
  onMessage: DemoCallback,
  delayBetweenSteps = DELAY
) {
  try {
    // Check balance
    const stream = await agent.stream(
      { messages: [new HumanMessage('show wallet balance in base mainnet')] },
      config
    );

    let balanceResponse = '';
    for await (const chunk of stream) {
      if ("agent" in chunk) {
        balanceResponse += chunk.agent.messages[0].content;
      } else if ("tools" in chunk) {
        balanceResponse += chunk.tools.messages[0].content;
      }
    }
    
    const balance = await extractBalance(balanceResponse);
    
    if (balance < REQUIRED_BALANCE) {
      await onMessage(`Insufficient balance. Need at least ${formatEther(REQUIRED_BALANCE)} ETH`, false);
      return;
    }

    // Alux Protocol Demo
    await onMessage('\n=== Starting Alux Protocol Demo ===\n', false);
    await setTimeout(MESSAGE_DELAY);
    
    for (const step of ALUX_DEMO_STEPS) {
      await onMessage(step, true);
      await setTimeout(MESSAGE_DELAY);
      
      const stepStream = await agent.stream(
        { messages: [new HumanMessage(step)] },
        config
      );

      let response = '';
      for await (const chunk of stepStream) {
        if ("agent" in chunk) {
          response += chunk.agent.messages[0].content;
        } else if ("tools" in chunk) {
          response += chunk.tools.messages[0].content;
        }
      }
      response = formatTransactionLink(response);
      await onMessage(response, false);
      await setTimeout(delayBetweenSteps);
    }

    // Xocolatl Protocol Demo
    await onMessage('\n=== Starting Xocolatl Protocol Demo ===\n', false);

    for (const step of XOCOLATL_DEMO_STEPS) {
      await onMessage(step, true);
      await setTimeout(1000);
      
      const stepStream = await agent.stream(
        { messages: [new HumanMessage(step)] },
        config
      );

      let response = '';
      for await (const chunk of stepStream) {
        if ("agent" in chunk) {
          response += chunk.agent.messages[0].content;
        } else if ("tools" in chunk) {
          response += chunk.tools.messages[0].content;
        }
      }
      response = formatTransactionLink(response);
      await onMessage(response, false);
      await setTimeout(delayBetweenSteps);
    }

    // After all steps are complete
    await onMessage('Demo completed successfully!', false);

  } catch (error) {
    await onMessage(`Demo failed: ${error}`, false);
  }
}