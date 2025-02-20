# AgentKit Multi-Protocol DeFi Chatbot

An AI-powered chatbot for interacting with multiple DeFi protocols on Base networks. Supports protocol interactions, wallet management, and automated demos.

## Features

### Protocol Support
- **Xocolatl Protocol (Base Mainnet)**
  - XOC stablecoin operations
  - WETH/CBETH collateral management
  - Integration with Alux lending pool
  - Position monitoring

- **BOBC Protocol (Base Sepolia)**
  - BOBC stablecoin operations
  - WETH collateral management
  - Faucet integration
  - Health factor monitoring

### Core Functionality
- Interactive chat interface
- Automated demo sequences
- Transaction management
- Balance checking
- Network validation
- Error handling

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agentkit-dapp.git
cd agentkit-dapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Start the development server:
```bash
npm start
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   └── App.tsx       # Main application component
│   └── public/           # Static assets
├── server/                # Backend Node.js server
│   └── src/
│       ├── action-providers/  # Protocol integrations
│       ├── scripts/          # Utility scripts
│       └── server.ts        # Express server
```

## Configuration

### Environment Setup

The project uses a three-tier environment configuration:

1. Root level (.env):
```bash
cp .env.example .env
```

2. Client level (client/.env):
```bash
cp client/.env.example client/.env
```

3. Server level (server/.env):
```bash
cp server/.env.example server/.env
```

Required environment variables:

Root level:
- `OPENAI_API_KEY`: OpenAI API key
- `NETWORK_ID`: Primary network ID
- `NETWORK_ID_2`: Secondary network ID
- `WALLET_PRIVATE_KEY`: Wallet private key

Client level:
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_BASE_EXPLORER_URL`: Block explorer URL

Server level:
- `PORT`: Server port
- `NODE_ENV`: Environment (development/production)
- `TELEGRAM_BOT_TOKEN`: (Optional) For Telegram integration

## Available Scripts

- `npm start`: Start both client and server
- `npm run build`: Build both client and server
- `npm run demo`: Run the demo sequence
- `npm test`: Run tests

## Development

### Adding New Features
1. Create new action provider in `server/src/action-providers/`
2. Add necessary schemas and constants
3. Update the agent configuration
4. Test thoroughly on testnet

### Code Style
- TypeScript for type safety
- ESLint + Prettier for code formatting
- React for frontend components
- Express for backend API

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Security

- Never commit sensitive credentials
- Use environment variables for secrets
- Validate all user inputs
- Monitor transaction status
- Implement proper error handling

## Security Notes

- Never commit .env files to version control
- Keep different environment configurations separate
- Use .env.example files as templates
- Regularly rotate API keys and credentials
- Monitor environment variable usage

## Support

For support, please open an issue in the repository or contact the maintainers.
