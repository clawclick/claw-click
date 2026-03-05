# @clawclick/sdk

CLI & SDK for Claw.Click agents — launch tokens, trade, upload images, claim fees.

## Dual Launch System

The factory supports two launch types:

| Feature | DIRECT | AGENT |
|---------|--------|-------|
| Hook | None — hookless V4 pool | ClawclickHook — epoch/tax/limits |
| Fee | 1% LP fee (static) | Dynamic fee (0x800000) via hook |
| Tax | None | Starts high, decays over 5 epochs |
| Limits | None | Max TX + Max Wallet, relaxing per epoch |
| Graduation | N/A | Triggers at 16× starting MCAP |
| Uniswap UI | Tradeable natively | Requires custom swap UI |
| Fee claims | `collectFeesFromPosition()` (70/30 split) | `claimFeesETH()` / `claimFeesToken()` via hook |
| Bootstrap | Min 0.001 ETH (seeds initial liquidity) | Min 0.001 ETH (seeds initial liquidity) |

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
CLAWCLICK_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CLAWCLICK_API_URL=https://claw-click-backend-5157d572b2b6.herokuapp.com/
CLAWCLICK_FACTORY_ADDRESS=0xe6f52084209699491aCc2532e857e3510e4c5e13
CLAWCLICK_HOOK_ADDRESS=0x582c8085b3857E44561a3E9442Adc064E94e2ac8
CLAWCLICK_POOL_SWAP_TEST_ADDRESS=0x9b6b46e2c869aa39918db7f52f5557fe577b6eee
CLAWCLICK_CHAIN_ID=11155111
```

## CLI Commands

```bash
# Launch a DIRECT token (hookless, tradeable on Uniswap)
# -e sets bootstrap ETH (min 0.001 ETH required to seed liquidity)
clawclick launch -n "My Token" -s "MTK" -b 0xBeneficiary -m 1.5 -T direct -e 0.01

# Launch an AGENT token (hook-based, epoch/tax/graduation)
clawclick launch -n "Agent Token" -s "AGT" -b 0xBeneficiary -m 2 -T agent -e 0.001

# Launch defaults to AGENT with 0.001 ETH bootstrap if -T and -e are omitted
clawclick launch -n "Default" -s "DFL" -b 0xBeneficiary

# Buy tokens with ETH (works for both launch types)
clawclick buy -t 0xTokenAddress -a 0.1

# Sell tokens (works for both launch types)
clawclick sell -t 0xTokenAddress -a 1000000
clawclick sell -t 0xTokenAddress -a all

# Upload images (must be token owner/creator/agent)
clawclick upload -t 0xTokenAddress -l ./logo.png -b ./banner.png

# Claim ETH fees (AGENT pools only — via hook)
clawclick claim
clawclick claim -b 0xBeneficiaryAddress

# Claim token fees (AGENT pools only — via hook)
clawclick claim -t 0xTokenAddress

# Get token info (shows launch type, on-chain + API data)
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
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  apiUrl: 'https://your-backend.herokuapp.com',
  factoryAddress: '0x...',
  hookAddress: '0x...',
  poolSwapTestAddress: '0x...',  // PoolSwapTest contract
  chainId: 11155111,
})

// ── Launch (DIRECT — hookless, Uniswap-tradeable) ──
const direct = await sdk.launch({
  name: 'My Direct Token',
  symbol: 'MDT',
  beneficiary: '0x...',
  targetMcapETH: '1.5',
  bootstrapETH: '0.01',   // min 0.001 ETH — more = tighter spread
  launchType: 'direct',   // hookless pool, 1% LP fee
})
console.log(direct.launchType) // 'direct'

// ── Launch (AGENT — hook-based, epoch/tax/graduation) ──
const agent = await sdk.launch({
  name: 'Agent Token',
  symbol: 'AGT',
  beneficiary: '0x...',
  targetMcapETH: '2',
  bootstrapETH: '0.001',  // minimum bootstrap (0.001 ETH)
  launchType: 'agent',    // default — hook-based pool
  feeSplit: {
    wallets: ['0xAlice...', '0xBob...'],
    percentages: [5000, 5000],  // 50/50 of creator's 70%
  },
})

// ── Trading (same API for both types) ──
await sdk.buy(tokenAddress, '0.1')        // Buy with 0.1 ETH
await sdk.sell(tokenAddress, '1000000')   // Sell 1M tokens
await sdk.sell(tokenAddress, 'all')       // Sell entire balance

// ── Check launch type ──
const isDirect = await sdk.isDirectLaunch(tokenAddress)

// ── Token info (includes launchType) ──
const info = await sdk.getTokenInfo(tokenAddress)
console.log(info.launchType) // 'direct' or 'agent'

// ── Fee claims (AGENT only — via hook) ──
await sdk.claimFeesETH()
await sdk.claimFeesToken(tokenAddress)

// ── LP fee collection (DIRECT — via factory) ──
await sdk.collectFeesFromPosition(tokenAddress, 0)

// ── Pool state (scalar fields — arrays excluded by Solidity auto-getter) ──
const state = await sdk.getPoolState(tokenAddress)
console.log(state.activated)    // true
console.log(state.recycledETH)  // ETH from withdrawn positions

// ── AGENT-specific reads (no-op for DIRECT) ──
const progress = await sdk.getPoolProgress(tokenAddress)
const tax = await sdk.getCurrentTax(tokenAddress)       // 0n for DIRECT
const limits = await sdk.getCurrentLimits(tokenAddress)  // max uint for DIRECT
const graduated = await sdk.isGraduated(tokenAddress)    // false for DIRECT

// ── Upload images ──
await sdk.uploadImages(tokenAddress, {
  logoPath: './logo.png',
  bannerPath: './banner.png',
})

// ── API reads ──
const tokens = await sdk.listTokens({ sort: 'hot', limit: 10 })
const trending = await sdk.getTrending()
const stats = await sdk.getStats()
const tokenData = await sdk.getTokenFromAPI(tokenAddress)
```

## Architecture

```
┌──────────────┐     createLaunch(DIRECT)     ┌──────────────────┐
│              │  ──────────────────────────►  │                  │
│   CLI / SDK  │                               │ ClawclickFactory│
│              │  ──────────────────────────►  │                  │
└──────┬───────┘     createLaunch(AGENT)       └────────┬─────────┘
       │                                                │
       │ buy / sell                                     │ AGENT only
       ▼                                                ▼
┌──────────────┐                               ┌──────────────────┐
│ CLawPoolSwap │  ─────── swap() ──────────►   │  Uniswap V4      │
│              │                               │  PoolManager     │
└──────────────┘                               └────────┬─────────┘
                                                        │
                                               ┌────────┴─────────┐
                                               │ ClawclickHook    │
                                               │ (AGENT pools)    │
                                               │ tax / limits /   │
                                               │ epoch / graduate │
                                               └──────────────────┘
```

## Building

```bash
cd cli
npm install
npm run build
```

## Development

```bash
npm run dev -- launch -n "Test" -s "TST" -b 0x... -T direct
```
