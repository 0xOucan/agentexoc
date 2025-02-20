import React, { useState, useRef, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Box,
  Typography,
  CircularProgress,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import axios from 'axios';
import { formatEther } from 'viem';
import { DemoButton } from './components/DemoButton';
import ReactMarkdown from 'react-markdown';

// Create a custom theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
});

interface Message {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      content: input,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3001/chat', {
        message: input
      });

      const botMessage: Message = {
        content: response.data.response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = 'Sorry, there was an error processing your message.';
      
      if (axios.isAxiosError(error) && error.response?.data?.userMessage) {
        errorMessage = error.response.data.userMessage;
      }

      const errorBotMessage: Message = {
        content: errorMessage,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (content: string): string => {
    // Format numbers first
    return content.replace(/(\d+)\s*(wei|gwei)/gi, (match, number, unit) => {
      try {
        const formatted = formatEther(BigInt(number));
        return `${formatted} ETH (${number} ${unit})`;
      } catch {
        return match;
      }
    });
  };

  const handleDemoMessage = (content: string, isUser: boolean) => {
    const message: Message = {
      content,
      isUser,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md" sx={{ height: '100vh', py: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ 
            p: 2, 
            backgroundColor: 'primary.main', 
            color: 'text.primary'
          }}>
            <Typography variant="h6">
              Agente XOC
            </Typography>
          </Box>

          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            bgcolor: 'background.default',
          }}>
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '80%' // Increased from 70% to give more space
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2, // Increased padding
                    backgroundColor: message.isUser ? 'primary.main' : '#2d2d2d',
                    color: message.isUser ? 'white' : '#e0e0e0',
                    wordBreak: 'break-word', // Ensures long words break
                    '& a': { // Style for links
                      color: '#90caf9',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    },
                    '& pre': { // Style for code blocks
                      backgroundColor: '#1e1e1e',
                      padding: 1,
                      borderRadius: 1,
                      overflowX: 'auto'
                    }
                  }}
                >
                  <Typography 
                    variant="body1" 
                    component="div"
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      '& ul, & ol': {
                        paddingLeft: 2,
                        marginTop: 0.5,
                        marginBottom: 0.5
                      },
                      '& a': {
                        color: '#90caf9',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      },
                      '& p': {
                        margin: '4px 0',
                        lineHeight: '1.5'
                      }
                    }}
                  >
                    <ReactMarkdown
                      components={{
                        a: ({node, children, ...props}) => (
                          <a 
                            {...props} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{color: '#90caf9'}}
                          >
                            {children}
                          </a>
                        ),
                        p: ({children}) => (
                          <p style={{margin: '4px 0', lineHeight: '1.5'}}>
                            {children}
                          </p>
                        )
                      }}
                    >
                      {formatMessage(message.content).replace(/\n\s*\n\s*\n/g, '\n\n')}
                    </ReactMarkdown>
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      marginTop: 1,
                      opacity: 0.7, 
                      color: message.isUser ? 'rgba(255,255,255,0.7)' : '#b0b0b0' 
                    }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          <Box 
            component="form" 
            onSubmit={handleSubmit}
            sx={{ 
              p: 2, 
              borderTop: 1, 
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              display: 'flex'
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    },
                  },
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                disabled={isLoading || !input.trim()}
                sx={{ minWidth: 100 }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Send'}
              </Button>
              <DemoButton onMessage={handleDemoMessage} />
            </Box>
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App; 