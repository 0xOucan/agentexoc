import express from 'express';
import cors from 'cors';
import { HumanMessage } from "@langchain/core/messages";
import { initializeAgent } from './chatbot';
import * as dotenv from 'dotenv';
import { formatEther } from 'viem';
import { runDemoSequence, formatTransactionLink } from './scripts/demoLogic';

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type'],
  exposedHeaders: ['Content-Type']
}));
app.use(express.json());

let agent: any;
let config: any;

async function initialize() {
  try {
    console.log("Initializing server...");
    const result = await initializeAgent();
    agent = result.agent;
    config = result.config;
    console.log('Agent initialized successfully');
  } catch (error) {
    console.error('Failed to initialize agent:', error);
    agent = null;
    config = null;
  }
}

// Initialize before starting the server
initialize().then(() => {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        userMessage: 'Please enter a message.'
      });
    }

    if (!agent || !config) {
      return res.status(503).json({ 
        error: 'Agent not initialized',
        userMessage: 'The AI agent is not ready. Please check your environment variables and restart the server.'
      });
    }

    const stream = await agent.stream(
      { messages: [new HumanMessage(message)] },
      config
    );

    let response = '';
    for await (const chunk of stream) {
      if ("agent" in chunk) {
        response += chunk.agent.messages[0].content;
      } else if ("tools" in chunk) {
        response += chunk.tools.messages[0].content;
      }
    }

    // Format wallet balance response
    if (response.includes('Wallet Details')) {
      const formatted = {
        address: response.match(/Address:\s*([0-9a-fA-Fx]+)/)?.[1] || '',
        ethBalance: response.match(/ETH Balance:\s*([\d.]+)/)?.[1] || '0',
        nativeBalance: response.match(/Native Balance:.*?(\d+)\s*WEI/)?.[1] || '0',
      };

      response = [
        'Wallet Details:',
        `- Address: ${formatted.address}`,
        `- Network: Base Mainnet`,
        `- ETH Balance: ${formatted.ethBalance} ETH`,
        `- Native Balance: ${formatted.nativeBalance} WEI`,
      ].join('\n');
    }
    // Format transaction response
    else if (response.includes('0x')) {
      const txHash = response.match(/0x[a-f0-9]{64}/i)?.[0] || '';
      const action = response.match(/Successfully\s+([^.]+)/i)?.[1] || 'Transaction completed';
      
      response = [
        `${action}.`,
        `Transaction: [View on Basescan](https://basescan.org/tx/${txHash})`
      ].join('\n');
    }

    res.json({ response });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      userMessage: 'Sorry, there was an error processing your message. Please check the server logs for details.'
    });
  }
});

app.get('/start-demo', async (req, res) => {
  try {
    if (!agent || !config) {
      return res.status(503).json({ 
        error: 'Agent not initialized',
        userMessage: 'The AI agent is not ready.'
      });
    }

    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Credentials': 'true'
    });

    // Function to send SSE message
    const sendMessage = (message: string, isUser: boolean) => {
      const data = JSON.stringify({ message, isUser });
      res.write(`data: ${data}\n\n`);
    };

    // Send initial message
    sendMessage('Starting demo...', false);

    // Start the demo sequence
    await runDemoSequence(
      agent,
      config,
      async (message: string, isUser: boolean) => {
        sendMessage(message, isUser);
      },
      5000
    );

    // Send completion message and end
    sendMessage('Demo completed!', false);
    res.end();
  } catch (error) {
    console.error('Demo failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        userMessage: 'Demo failed. Please check the server logs for details.'
      });
    } else {
      const data = JSON.stringify({
        message: 'Demo failed. Please check the server logs for details.',
        isUser: false
      });
      res.write(`data: ${data}\n\n`);
      res.end();
    }
  }
});