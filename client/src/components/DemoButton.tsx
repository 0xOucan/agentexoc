import React from 'react';
import { Button } from '@mui/material';

interface DemoButtonProps {
  onMessage: (content: string, isUser: boolean) => void;
}

interface DemoMessage {
  message: string;
  isUser: boolean;
}

export function DemoButton({ onMessage }: DemoButtonProps) {
  const [isRunning, setIsRunning] = React.useState(false);
  const eventSourceRef = React.useRef<EventSource | null>(null);

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
  };

  React.useEffect(() => {
    return () => cleanup();
  }, []);

  const startDemo = () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      // Create EventSource for SSE
      const source = new EventSource('http://localhost:3001/start-demo');
      eventSourceRef.current = source;

      // Handle incoming messages
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as DemoMessage;
          onMessage(data.message, data.isUser);

          // Check for WETH-related messages
          if (data.message.includes('ETH balance too low')) {
            console.log('Checking WETH balance...');
          }

          // Check if this is the completion message
          if (data.message === 'Demo completed!') {
            cleanup();
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      // Handle connection error
      source.onerror = (error) => {
        console.error('EventSource failed:', error);
        onMessage('Connection to demo failed. Please try again.', false);
        cleanup();
      };

    } catch (error) {
      console.error('Failed to start demo:', error);
      onMessage('Failed to start demo. Please try again.', false);
      cleanup();
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <Button
      variant="outlined"
      onClick={startDemo}
      disabled={isRunning}
      sx={{ ml: 1 }}
    >
      {isRunning ? 'Demo Running...' : 'Run Demo'}
    </Button>
  );
} 