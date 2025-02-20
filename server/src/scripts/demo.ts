import { initializeAgent } from '../chatbot';
import { setTimeout } from 'timers/promises';
import { runDemoSequence } from './demoLogic';

async function typeMessage(message: string) {
  for (const char of message) {
    process.stdout.write(char);
    await setTimeout(Math.random() * 100);
  }
  process.stdout.write('\n');
  await setTimeout(500);
}

async function simulateEnter() {
  await setTimeout(1000);
  process.stdout.write('↵\n');
  await setTimeout(1000);
}

async function runTerminalDemo() {
  const { agent, config } = await initializeAgent();
  
  await runDemoSequence(
    agent,
    config,
    async (message: string, isUser: boolean) => {
      if (isUser) {
        await typeMessage(message);
        await simulateEnter();
      } else {
        console.log(message);
      }
    }
  );
}

runTerminalDemo();