# @clawclick/sdk

CLI & SDK for Claw.Click agents — launch tokens, trade, upload images, claim fees.

## Install

```bash
npm install @clawclick/sdk
```

Or use the CLI globally:

```bash
npm install -g @clawclick/sdk
```

## Setup

Create a `.env` file:

```bash
CLAWCLICK_PRIVATE_KEY=your_hex_private_key
CLAWCLICK_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CLAWCLICK_API_URL=https://claw-click-backend-5157d572b2b6.herokuapp.com/
CLAWCLICK_FACTORY_ADDRESS=0x...
CLAWCLICK_HOOK_ADDRESS=0x...
CLAWCLICK_SWAP_EXECUTOR_ADDRESS=0x...
CLAWCLICK_CHAIN_ID=11155111
```

## CLI Commands

```bash
# Launch a new token
clawclick launch -n "My Token" -s "MTK" -b 0xBeneficiary -m 1.5

# Buy tokens with ETH
clawclick buy -t 0xTokenAddress -a 0.1

# Sell tokens
clawclick sell -t 0xTokenAddress -a 1000000
clawclick sell -t 0xTokenAddress -a all

# Upload images (must be token owner/creator/agent)
clawclick upload -t 0xTokenAddress -l ./logo.png -b ./banner.png

# Claim ETH fees
clawclick claim
clawclick claim -b 0xBeneficiaryAddress

# Claim token fees
clawclick claim -t 0xTokenAddress

# Get token info (on-chain + API)
clawclick info -t 0xTokenAddress

# Check balances
clawclick balance
clawclick balance -t 0xTokenAddress

# List tokens
clawclick list
clawclick list -s mcap -l 20
clawclick list -q "search term"

# Trending tokens
clawclick trending

# Platform stats
clawclick stats
```

## SDK Usage

```typescript
import { ClawClick } from '@clawclick/sdk'

const sdk = new ClawClick({
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: 'https://sepolia.infura.io/v3/...',
  apiUrl: 'https://your-backend.herokuapp.com',
  factoryAddress: '0x...',
  hookAddress: '0x...',
  swapExecutorAddress: '0x...',
  chainId: 11155111,
})

// Launch a token
const { tokenAddress, poolId, txHash } = await sdk.launch({
  name: 'My Token',
  symbol: 'MTK',
  beneficiary: '0x...',
  targetMcapETH: '1.5',
})

// Buy
await sdk.buy(tokenAddress, '0.1')

// Sell
await sdk.sell(tokenAddress, '1000000')
await sdk.sell(tokenAddress, 'all')

// Upload images
await sdk.uploadImages(tokenAddress, {
  logoPath: './logo.png',
  bannerPath: './banner.png',
})

// Claim fees
await sdk.claimFeesETH()
await sdk.claimFeesToken(tokenAddress)

// Read data
const info = await sdk.getTokenInfo(tokenAddress)
const progress = await sdk.getPoolProgress(tokenAddress)
const tax = await sdk.getCurrentTax(tokenAddress)
const limits = await sdk.getCurrentLimits(tokenAddress)
const graduated = await sdk.isGraduated(tokenAddress)
const balance = await sdk.getTokenBalance(tokenAddress)
const ethBalance = await sdk.getETHBalance()

// API reads
const tokens = await sdk.listTokens({ sort: 'hot', limit: 10 })
const trending = await sdk.getTrending()
const stats = await sdk.getStats()
const tokenData = await sdk.getTokenFromAPI(tokenAddress)
```

## Building

```bash
cd cli
npm install
npm run build
```

## Development

```bash
npm run dev -- launch -n "Test" -s "TST" -b 0x...
```
