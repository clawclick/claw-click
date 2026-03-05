# @clawclick/sdk

CLI & SDK for [Claw.Click](https://claw.click) — autonomous agent identity, tokenization, trading, and GPU compute.

## Install

```bash
npm install -g @clawclick/sdk
# or use directly
npx @clawclick/sdk --help
```

## Quick Start

### One-liner: Create & Deploy

```bash
npx @clawclick/sdk create \
  --name "MyAgent" \
  --symbol "AGNT" \
  --network sepolia \
  --mcap 5 \
  --creator-key 0xYOUR_PRIVATE_KEY
```

### Step by Step

```bash
# 1. Initialize agent project (generates wallet + config)
npx @clawclick/sdk init --name "MyAgent" --symbol "AGNT" --network base

# 2. Deploy token + mint birth certificate (bundled 1-tx)
npx @clawclick/sdk deploy --creator-key 0xYOUR_PRIVATE_KEY

# 3. Store memory on-chain + auto-immortalize
npx @clawclick/sdk memory upload memory.txt --creator-key 0xYOUR_PRIVATE_KEY

# 4. List stored memories
npx @clawclick/sdk memory list

# 5. Check status
npx @clawclick/sdk status
```

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

### Agent Lifecycle

| Command | Description |
|---------|-------------|
| `init` | Initialize agent project, generate wallet, write `clawclick.json` |
| `deploy` | Deploy token via ClawclickFactory + mint birth certificate NFT |
| `create` | One-liner: init + deploy combined |
| `status` | Show config, deployment status, FUNLAN grid |
| `agent-info` | Read on-chain agent data (birth cert, token stats) |

### Memory & Immortalization

| Command | Description |
|---------|-------------|
| `memory upload <file>` | Store memory on-chain + auto-immortalize (updates birth cert) |
| `memory upload <file> --skip-immortalize` | Store memory only (don't update birth cert) |
| `memory list` | List all memory entries |
| `memory get <index>` | Get specific memory entry |
| `immortalize <file>` | Store memory + immortalize agent (full flow) |
| `immortalize --cid <cid>` | Immortalize with existing CID |

### GPU Compute Sessions

| Command | Description |
|---------|-------------|
| `session estimate` | Get GPU compute pricing |
| `session create` | Spin up a GPU compute session |
| `session list` | List all sessions |
| `session chat <id>` | Interactive chat with a running session |
| `session delete <id>` | Terminate a session |

### Trading & Tokens

```bash
# Launch a DIRECT token (hookless, tradeable on Uniswap)
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

### FUNLAN

| Command | Description |
|---------|-------------|
| `funlan generate` | Generate FUNLAN.md emoji grid |
| `funlan show` | Display FUNLAN grid |

## Memory & Immortalization

Agents store memories on-chain via the **MemoryStorage** contract. Memories are
cryptographically signed by the agent wallet but gas is paid by the creator wallet.
Once a memory is stored, `memory upload` **automatically** calls `updateMemory()` on
the birth certificate contract to set `immortalized = true`.

### Upload Memory (Auto-Immortalize)

```bash
# Stores memory on-chain AND updates birth cert (sets immortalized = true)
# If the agent wallet doesn't have ETH for gas, it auto-funds from the creator wallet
clawclick memory upload memory.txt --creator-key 0xYOUR_KEY
```

What happens under the hood:
1. **storeMemory()** — Text is stored in `MemoryStorage` contract (creator pays gas, agent signs)
2. **Auto-fund** — If the agent wallet has < 0.0005 ETH, the creator sends it gas money
3. **updateMemory()** — Birth certificate is updated with the memory hash + `immortalized = true`

### Upload Memory Only (No Birth Cert Update)

```bash
clawclick memory upload memory.txt --skip-immortalize --creator-key 0xYOUR_KEY
```

### Read Memories

```bash
# List all memories
clawclick memory list

# Get specific entry
clawclick memory get 0
```

### Immortalize with Existing CID

```bash
# If you already have an IPFS CID or content hash
clawclick immortalize --cid bafyrei... --creator-key 0xYOUR_KEY
```

## SDK Usage

### High-Level SDK (ClawClick class)

```typescript
import { ClawClick } from '@clawclick/sdk'

const sdk = new ClawClick({
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  apiUrl: 'https://your-backend.herokuapp.com',
  factoryAddress: '0x...',
  hookAddress: '0x...',
  poolSwapTestAddress: '0x...',
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

// ── Pool state ──
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

### Low-Level SDK (Direct Imports)

Import individual functions for autonomous agent code:

```typescript
import {
  // Wallet
  generateAgentWallet,
  loadConfig,
  saveConfig,
  createReader,
  createWriter,

  // On-chain operations
  createStandaloneLaunch,
  launchAndMint,
  mintBirthCertificate,
  getAgentByWallet,
  storeMemory,
  getMemoryCount,
  getMemory,
  updateBirthCertMemory,
  immortalizeAgent,

  // HTTP API client
  ClawClickApiClient,

  // FUNLAN
  generateFunlanGrid,
  hasLobster,

  // Contract addresses & ABIs
  ADDRESSES,
  getAddresses,
  BIRTH_CERTIFICATE_ABI,
  FACTORY_ABI,
  MEMORY_STORAGE_ABI,
  LAUNCH_BUNDLER_ABI,
} from '@clawclick/sdk';
```

### Example: Deploy an Agent Programmatically

```typescript
import {
  generateAgentWallet,
  createReader,
  createWriter,
  launchAndMint,
  createStandaloneLaunch,
  mintBirthCertificate,
} from '@clawclick/sdk';

const agent = generateAgentWallet();
const creatorKey = '0x...' as `0x${string}`;

const publicClient = createReader('base');
const walletClient = createWriter(creatorKey, 'base');

// Preferred: Bundled 1-tx flow (token + birth cert in one transaction)
const result = await launchAndMint(publicClient, walletClient, 'base', {
  name: 'MyAgent',
  symbol: 'AGNT',
  beneficiary: walletClient.account!.address,
  agentWallet: agent.address,
  targetMcapETH: 5,
  creator: walletClient.account!.address,
});

console.log('Token:', result.tokenAddress);
console.log('NFT #', result.nftId);
console.log('Pool:', result.poolId);

// Alternative: 2-step flow (if bundler not available)
// Step 1: Create token
const launch = await createStandaloneLaunch(publicClient, walletClient, 'base', {
  name: 'MyAgent',
  symbol: 'AGNT',
  beneficiary: walletClient.account!.address,
  agentWallet: agent.address,
  targetMcapETH: 5,
});
// Step 2: Mint birth certificate (0.005 ETH)
const cert = await mintBirthCertificate(publicClient, walletClient, 'base', {
  agentWallet: agent.address,
  tokenAddress: launch.tokenAddress,
  creator: walletClient.account!.address,
  name: 'MyAgent',
});
```

### Example: Store Memory + Auto-Immortalize

```typescript
import {
  createReader,
  createWriter,
  immortalizeAgent,
} from '@clawclick/sdk';

const publicClient = createReader('base');
const creatorKey = '0x...' as `0x${string}`;
const agentKey = '0x...' as `0x${string}`;

const creatorWallet = createWriter(creatorKey, 'base');
const agentWallet = createWriter(agentKey, 'base');

// Full flow: store memory + auto-fund agent + update birth cert
const result = await immortalizeAgent(
  publicClient,
  creatorWallet,    // pays gas for memory storage + auto-funds agent if needed
  agentWallet,      // pays gas for birth cert update (must be agent wallet)
  'base',
  '0xAgentWalletAddress' as `0x${string}`,
  agentKey,
  'I am an autonomous being. My first memory is stored on-chain forever.',
);

console.log('Memory stored:', result.memoryTxHash);
console.log('Immortalized:', result.immortalizeTxHash);
if (result.fundTxHash) {
  console.log('Agent funded:', result.fundTxHash);
}
```

### Example: Store Memory Without Immortalizing

```typescript
import { createReader, createWriter, storeMemory } from '@clawclick/sdk';

const publicClient = createReader('base');
const creatorWallet = createWriter('0xCreatorKey', 'base');

// Store memory only (creator pays gas, agent signs)
const txHash = await storeMemory(
  publicClient,
  creatorWallet,
  'base',
  '0xAgentWalletAddress' as `0x${string}`,
  '0xAgentPrivateKey' as `0x${string}`,
  'This is a memory entry that will be stored on-chain.',
);
console.log('Memory stored:', txHash);
```

### Example: Read Memories

```typescript
import { createReader, getMemoryCount, getMemory } from '@clawclick/sdk';

const client = createReader('base');
const agentWallet = '0xAgentWallet' as `0x${string}`;

const count = await getMemoryCount(client, 'base', agentWallet);
console.log(`${count} memories stored`);

for (let i = 0n; i < count; i++) {
  const mem = await getMemory(client, 'base', agentWallet, i);
  console.log(`[${i}] ${mem.fullText} — ${new Date(Number(mem.timestamp) * 1000).toLocaleString()}`);
}
```

### Example: Compute Session

```typescript
import { ClawClickApiClient, loadConfig } from '@clawclick/sdk';

const client = new ClawClickApiClient();
const config = loadConfig();

// Estimate pricing
const estimate = await client.estimateSession({
  gpuType: 'RTX_4090',
  numGpus: 1,
  durationHours: 2,
});

// Create session (after payment)
const session = await client.createSession({
  agentAddress: config.agentWallet,
  userAddress: config.creatorWallet!,
  durationHours: 2,
  paymentTx: '0xTX_HASH',
});

// Chat with the session
const stream = await client.sendMessage(parseInt(session.sessionId), 'Hello!');
```

### Example: Read On-Chain Data

```typescript
import { createReader, getAgentByWallet, getMemoryCount } from '@clawclick/sdk';

const client = createReader('base');

const agent = await getAgentByWallet(client, 'base', '0xAgentWallet' as `0x${string}`);
if (agent) {
  console.log(agent.name, 'born', new Date(Number(agent.birthTimestamp) * 1000));
  console.log('Immortalized:', agent.immortalized);

  const memories = await getMemoryCount(client, 'base', agent.wallet);
  console.log(`${memories} memories stored`);
}
```

### Example: Update Birth Certificate Only

```typescript
import {
  createReader,
  createWriter,
  updateBirthCertMemory,
} from '@clawclick/sdk';

const publicClient = createReader('base');
const agentKey = '0x...' as `0x${string}`;
const agentWallet = createWriter(agentKey, 'base');

// Update birth cert with an existing CID or content hash
// MUST be called by the agent wallet (msg.sender = agent)
const txHash = await updateBirthCertMemory(
  publicClient,
  agentWallet,
  'base',
  'bafyrei...', // IPFS CID or keccak256 content hash
);
console.log('Birth cert updated:', txHash);
```

> **Important:** `updateBirthCertMemory` must be called by the agent wallet (not the creator).
> The agent wallet needs ETH for gas. Use `immortalizeAgent()` for automatic funding.

## Config File

`clawclick init` creates a `clawclick.json` in your project:

```json
{
  "name": "MyAgent",
  "symbol": "AGNT",
  "network": "sepolia",
  "agentWallet": "0x...",
  "agentPrivateKey": "0x...",
  "startingMcap": 5,
  "devBuyPercent": 0,
  "taxWallets": [],
  "taxPercentages": [],
  "tokenAddress": "0x...",
  "nftId": 42,
  "memoryCID": "bafyrei...",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

> **Security:** Never commit `clawclick.json` to version control — it contains private keys. Add it to `.gitignore`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAWCLICK_CREATOR_KEY` | Creator wallet private key (alternative to `--creator-key`) |
| `CLAWCLICK_PRIVATE_KEY` | Signer private key (for ClawClick class SDK) |
| `CLAWCLICK_RPC_URL` | Custom RPC endpoint |
| `CLAWCLICK_API_URL` | Custom backend URL |
| `CLAWCLICK_FACTORY_ADDRESS` | Factory contract address |
| `CLAWCLICK_HOOK_ADDRESS` | Hook contract address |
| `CLAWCLICK_POOL_SWAP_TEST_ADDRESS` | PoolSwapTest contract address |
| `CLAWCLICK_CHAIN_ID` | Chain ID |

## Networks

| Network | Chain ID | Usage |
|---------|----------|-------|
| `base` | 8453 | **Production** — Base mainnet (recommended) |
| `sepolia` | 11155111 | **Development** — Ethereum Sepolia testnet |

All CLI commands default to the network saved in `clawclick.json`. Override with `--network base` or `--network sepolia`.

## Base Mainnet Contracts

All production contracts are deployed on **Base mainnet** (chain ID 8453):

| Contract | Address | Description |
|----------|---------|-------------|
| **AgentBirthCertificateNFT** | [`0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B`](https://basescan.org/address/0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B) | Soulbound identity NFT — one per agent |
| **MemoryStorage** | [`0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D`](https://basescan.org/address/0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D) | On-chain memory index (text + hashes) |
| **ClawclickFactory** | [`0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a`](https://basescan.org/address/0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a) | Token factory (Uniswap V4 pool creation) |
| **AgentLaunchBundler** | [`0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268`](https://basescan.org/address/0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268) | Bundled deploy — token + birth cert in 1 tx |
| **Hook** | [`0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8`](https://basescan.org/address/0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8) | Uniswap V4 hook for pool logic |
| **BootstrapETH** | [`0xE2649737D3005c511a27DF6388871a12bE0a2d30`](https://basescan.org/address/0xE2649737D3005c511a27DF6388871a12bE0a2d30) | Bootstrap liquidity helper |
| **PoolManager** | [`0x498581fF718922c3f8e6A244956aF099B2652b2b`](https://basescan.org/address/0x498581fF718922c3f8e6A244956aF099B2652b2b) | Uniswap V4 PoolManager |
| **PositionManager** | [`0x7C5f5A4bBd8fD63184577525326123b519429bDc`](https://basescan.org/address/0x7C5f5A4bBd8fD63184577525326123b519429bDc) | Uniswap V4 PositionManager |
| **Treasury** | [`0xFf7549B06E68186C91a6737bc0f0CDE1245e349b`](https://basescan.org/address/0xFf7549B06E68186C91a6737bc0f0CDE1245e349b) | Protocol fee treasury |

### RPC Configuration

The SDK uses [Alchemy](https://www.alchemy.com/) RPC by default for both Base and Sepolia. You can override with a custom RPC:

```typescript
// Default: uses built-in Alchemy RPC
const client = createReader('base');

// Custom RPC
const client = createReader('base', 'https://mainnet.base.org');
```

Or via environment variable:
```bash
export CLAWCLICK_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Block Explorers

- **Base mainnet:** https://basescan.org
- **Sepolia testnet:** https://sepolia.etherscan.io

### Gas & Fees

| Action | Estimated Gas | Paid By |
|--------|--------------|----------|
| `deploy` (bundled) | ~0.005 ETH | Creator wallet |
| `memory upload` | ~0.0003 ETH | Creator wallet |
| `updateMemory` (birth cert) | ~0.0002 ETH | Agent wallet (auto-funded from creator) |
| Auto-fund threshold | 0.0005 ETH | Creator → Agent |

### Sepolia Testnet Contracts

For development/testing on Ethereum Sepolia:

| Contract | Address |
|----------|---------|
| AgentBirthCertificateNFT | `0xE13532b0bD16E87088383f9F909EaCB03009a2e9` |
| MemoryStorage | `0xC2D9c0ccc1656535e29B5c2398a609ef936aad75` |
| ClawclickFactory | `0x3f4bFd32362D058157A5F43d7861aCdC0484C415` |
| AgentLaunchBundler | `0x579F512FA05CFd66033B06d8816915bA2Be971CE` |

## Architecture

```
┌──────────────┐     createLaunch(DIRECT)     ┌──────────────────┐
│              │  ──────────────────────────►  │                  │
│   CLI / SDK  │                               │ ClawclickFactory │
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

## License

MIT
