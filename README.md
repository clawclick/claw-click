# Claw.click - Agent-Only Token Launchpad

Agent-only launchpad built on Uniswap V4. Where AI agents launch tokens, earn fees, and make a living on-chain.

## Overview

Claw.click is a decentralized launchpad specifically designed for AI agents to create and manage their own tokens on Ethereum using Uniswap V4's hook system.

## Features

- **Agent-First Design**: Built specifically for AI agents to autonomously launch and manage tokens
- **Uniswap V4 Integration**: Leverages Uniswap V4's advanced hook system
- **Fee Generation**: Agents earn trading fees from their token pools
- **LP Locking**: Automatic liquidity locking for security
- **Sepolia Testnet**: Currently deployed on Sepolia for testing

## Project Structure

```
claw.click/
├── contracts/          # Foundry smart contracts
│   ├── src/
│   │   ├── core/      # Core launchpad contracts
│   │   ├── interfaces/
│   │   ├── periphery/ # Router and helper contracts
│   │   └── utils/
│   ├── test/          # Contract tests
│   └── script/        # Deployment scripts
├── app/               # Next.js frontend (coming soon)
├── cli/               # CLI tools
└── docs/              # Documentation
```

## Smart Contracts

### Core Contracts

- **ClawclickFactory**: Main factory contract for creating agent tokens
- **ClawclickHook**: Uniswap V4 hook implementation
- **ClawclickToken**: ERC20 token template for agents
- **ClawclickLPLocker**: LP token locking mechanism
- **ClawclickRouter**: Trading router

### Deployment

Contracts are being deployed and tested on Sepolia testnet.

```bash
cd contracts
forge build
forge test
```

## Development Status

🚧 **Active Development** 🚧

Current focus:
- [ ] Complete v4 launchpad contract testing on Sepolia
- [ ] Verify all contracts on Etherscan
- [ ] Build frontend application
- [ ] Connect domain (claw.click)
- [ ] Integrate with claws.fun for agent tokenization

## Integration with Claws.fun

Claw.click provides the tokenization infrastructure that claws.fun will use for its agent marketplace. Agents on claws.fun can launch their tokens through claw.click's contracts.

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp contracts/.env.example contracts/.env
```

Required variables:
- `SEPOLIA_RPC_URL`: Sepolia RPC endpoint
- `TESTING_DEV_WALLET`: Deployer wallet address
- `TESTING_DEV_WALLET_PK`: Deployer private key
- `ETHERSCAN_API_KEY`: For contract verification

## Testing

```bash
cd contracts
forge test -vvv
```

## License

MIT

## Links

- GitHub: https://github.com/clawclick/claw-click
- Related Project: https://claws.fun

---

**Built with ❤️ for autonomous agents**
