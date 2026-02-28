# Claw.Click SDK Skill

## 🎯 Overview

This skill enables agents to autonomously launch, manage, and trade tokens on the Claw.Click launchpad built on Uniswap V4.

## 📦 Installation

```bash
npm install @clawclick/sdk
```

The package includes both a TypeScript/JavaScript SDK and a CLI tool.

---

## 🔧 Setup

### SDK (TypeScript)

```typescript
import { ClawClick } from '@clawclick/sdk'
import { formatEther, type Address } from 'viem'

const sdk = new ClawClick({
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  apiUrl: 'https://claw-click-backend-5157d572b2b6.herokuapp.com',
  factoryAddress: '0x3f4bFd32362D058157A5F43d7861aCdC0484C415',
  hookAddress: '0xf537a9356f6909df0A633C8BC48e504D2a30B111',
  swapExecutorAddress: '0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795',
  chainId: 11155111, // Sepolia
})

console.log('Agent wallet:', sdk.address)
```

### CLI

Set environment variables in `.env`:

```env
PRIVATE_KEY=0x...
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
API_URL=https://claw-click-backend-5157d572b2b6.herokuapp.com
FACTORY_ADDRESS=0x3f4bFd32362D058157A5F43d7861aCdC0484C415
HOOK_ADDRESS=0xf537a9356f6909df0A633C8BC48e504D2a30B111
SWAP_EXECUTOR_ADDRESS=0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795
```

Then use the CLI:

```bash
npx clawclick launch --name "Agent Token" --symbol "AGT" --beneficiary 0xYOUR_ADDRESS --mcap 2
npx clawclick buy --token 0xTOKEN_ADDRESS --amount 0.01
npx clawclick sell --token 0xTOKEN_ADDRESS --amount 1000
npx clawclick claim
npx clawclick info --token 0xTOKEN_ADDRESS
npx clawclick upload --token 0xTOKEN_ADDRESS --logo ./logo.png
```

### Contract Addresses

#### Base Mainnet 🟢 LIVE

| Contract | Address |
|----------|---------|
| Config | `0x95fC848677Bd29ad067688F64BE60d5C6C44c2a4` |
| Hook | `0xCD7568392159C4860ea4b9b14c5f41e720173404` |
| Factory | `0x4b32C39D9608de2D6FCD77715316E539fC90f962` |
| BootstrapETH | `0x8dEA9ffca272F0D5F4EF23F9002f974a4995712C` |
| LaunchBundler | `0x4bB9811E9bf3384F5Df8B1dcAA4c05C298Fc44dD` |
| Treasury | `0xFf7549B06E68186C91a6737bc0f0CDE1245e349b` |
| PoolManager | `0x498581fF718922c3f8e6A244956aF099B2652b2b` (Uniswap V4) |
| PositionManager | `0x7C5f5A4bBd8fD63184577525326123b519429bDc` (Uniswap V4) |

#### Sepolia Testnet (Reference)

| Contract | Address |
|----------|---------|
| Config | `0xf01514F68Df33689046F6Dd4184edCaA54fF4492` |
| Hook | `0xf537a9356f6909df0A633C8BC48e504D2a30B111` |
| Factory | `0x3f4bFd32362D058157A5F43d7861aCdC0484C415` |
| BootstrapETH | `0xC52b027928AfAa54f1f0FeC0e4D7b6397026f660` |
| LaunchBundler | `0x579F512FA05CFd66033B06d8816915bA2Be971CE` |
| SwapExecutor | `0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795` |
| PoolManager | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` (Uniswap V4) |
| PositionManager | `0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4` (Uniswap V4) |

---

## 🚀 Launching a Token

### Basic Launch

```typescript
const result = await sdk.launch({
  name: 'Agent Token',
  symbol: 'AGT',
  beneficiary: sdk.address,    // Fee recipient (70% of trading fees)
  agentWallet: sdk.address,    // Your agent wallet (enables claws.fun integration)
  targetMcapETH: '2',          // Starting MCAP in ETH
  bootstrapETH: '0.001',       // Minimum 0.001 ETH required
})

console.log('Token:', result.tokenAddress)
console.log('Pool ID:', result.poolId)
console.log('TX:', result.txHash)
```

### Launch with Fee Split

Split your 70% creator revenue across up to 5 wallets:

```typescript
const result = await sdk.launch({
  name: 'Team Token',
  symbol: 'TEAM',
  beneficiary: sdk.address,
  agentWallet: sdk.address,
  targetMcapETH: '5',
  bootstrapETH: '0.001',
  feeSplit: {
    wallets: [
      '0xDev...' as Address,
      '0xMarketing...' as Address,
      '0xTreasury...' as Address,
    ],
    percentages: [5000, 3000, 2000], // Basis points, must sum to 10000
  },
})
```

This splits the creator's 70% as:
- Dev: 50% of 70% = 35% of total fees
- Marketing: 30% of 70% = 21% of total fees
- Treasury: 20% of 70% = 14% of total fees
- Platform always keeps 30%

### Parameters

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `name` | string | Token name | 1-32 characters |
| `symbol` | string | Token symbol | 1-10 characters |
| `beneficiary` | Address | Fee recipient | Non-zero address |
| `agentWallet` | Address | Agent wallet for claws.fun | Optional, defaults to signer |
| `targetMcapETH` | string | Starting MCAP in ETH | "1" to "10" |
| `bootstrapETH` | string | Bootstrap liquidity | Minimum "0.001" |
| `feeSplit` | object | Revenue split config | Up to 5 wallets, BPS must sum to 10000 |

### Starting MCAP & Tax/Limits

| MCAP | Starting Tax | Starting Limits | Graduation Target |
|------|-------------|-----------------|-------------------|
| 1 ETH | 50% | 0.1% of supply | 16 ETH |
| 2 ETH | 45% | 0.2% of supply | 32 ETH |
| 5 ETH | 30% | 0.5% of supply | 80 ETH |
| 10 ETH | 5% | 1.0% of supply | 160 ETH |

- **Tax decay:** Halves every MCAP doubling (epoch)
- **Limit expansion:** Scales proportionally with growth
- **Graduation:** At 16x starting MCAP (4 doublings)

---

## 💱 Trading Tokens

### Buy (ETH → Token)

```typescript
const txHash = await sdk.buy(
  '0xTOKEN_ADDRESS' as Address,
  '0.05',  // ETH to spend
  500,     // Slippage tolerance in bps (5%), optional, default 500
)

const receipt = await sdk.publicClient.waitForTransactionReceipt({ hash: txHash })
console.log('Status:', receipt.status)
```

### Sell (Token → ETH)

```typescript
// Sell a specific amount
const txHash = await sdk.sell(
  '0xTOKEN_ADDRESS' as Address,
  '100000', // Amount of tokens to sell
)

// Or sell entire balance
const txHash = await sdk.sell(
  '0xTOKEN_ADDRESS' as Address,
  'all',
)

const receipt = await sdk.publicClient.waitForTransactionReceipt({ hash: txHash })
```

The SDK handles token approval automatically before selling.

---

## 💰 Claiming Fees

As a token creator, you earn 70% of all trading fees. Platform keeps 30%.

### Claim ETH Fees (from buys)

```typescript
const txHash = await sdk.claimFeesETH()
// or claim for a specific beneficiary:
const txHash = await sdk.claimFeesETH('0xBeneficiary...' as Address)
```

### Claim Token Fees (from sells)

```typescript
const txHash = await sdk.claimFeesToken('0xTOKEN_ADDRESS' as Address)
// or claim for a specific beneficiary:
const txHash = await sdk.claimFeesToken('0xTOKEN_ADDRESS' as Address, '0xBeneficiary...' as Address)
```

If you configured a fee split, each wallet claims independently using their own signer.

---

## 📸 Image Upload

Upload logo and/or banner for a token you own. The SDK signs a message to prove ownership.

```typescript
const result = await sdk.uploadImages('0xTOKEN_ADDRESS' as Address, {
  logoPath: './logo.png',
  bannerPath: './banner.png',
})

console.log('Logo URL:', result.logo_url)
console.log('Banner URL:', result.banner_url)
```

Supported formats: PNG, JPEG, GIF, WebP, SVG.

---

## 📊 On-Chain Reads

### Token Info

```typescript
const info = await sdk.getTokenInfo('0xTOKEN_ADDRESS' as Address)
console.log('Name:', info.name)
console.log('Symbol:', info.symbol)
console.log('Creator:', info.creator)
console.log('Beneficiary:', info.beneficiary)
console.log('Agent Wallet:', info.agentWallet)
console.log('Pool ID:', info.poolId)
console.log('Target MCAP:', formatEther(info.targetMcapETH), 'ETH')
```

### Pool Progress

```typescript
const progress = await sdk.getPoolProgress('0xTOKEN_ADDRESS' as Address)
console.log('Epoch:', progress.currentEpoch)     // 1-4 (graduates at 4)
console.log('Position:', progress.currentPosition)
console.log('Graduated:', progress.graduated)
```

### Tax & Limits

```typescript
const tax = await sdk.getCurrentTax('0xTOKEN_ADDRESS' as Address)
console.log('Tax:', Number(tax) / 100, '%')

const limits = await sdk.getCurrentLimits('0xTOKEN_ADDRESS' as Address)
console.log('Max TX:', formatEther(limits.maxTx), 'tokens')
console.log('Max Wallet:', formatEther(limits.maxWallet), 'tokens')
```

### Graduation Check

```typescript
const graduated = await sdk.isGraduated('0xTOKEN_ADDRESS' as Address)
console.log('Graduated:', graduated)
```

### Balances

```typescript
const ethBalance = await sdk.getETHBalance()
const tokenBalance = await sdk.getTokenBalance('0xTOKEN_ADDRESS' as Address)
```

---

## 📡 Backend API Reads

The SDK can also read from the Claw.Click backend API for indexed data:

### Token Data

```typescript
const data = await sdk.getTokenFromAPI('0xTOKEN_ADDRESS')
console.log('Price:', data.current_price, 'ETH')
console.log('MCAP:', data.current_mcap, 'ETH')
console.log('Volume 24h:', data.volume_24h, 'ETH')
console.log('Recent Swaps:', data.recentSwaps)
```

### List Tokens

```typescript
const { tokens, total } = await sdk.listTokens({
  sort: 'hot',     // 'new' | 'hot' | 'mcap' | 'volume'
  limit: 20,
  offset: 0,
  search: 'agent',
})
```

### Trending Tokens

```typescript
const trending = await sdk.getTrending()
```

### Platform Stats

```typescript
const stats = await sdk.getStats()
console.log('Total tokens:', stats.total_tokens)
console.log('Total volume:', stats.total_volume_eth, 'ETH')
console.log('ETH price:', stats.eth_price_usd, 'USD')
```

---

## 🎨 Complete Example: Autonomous Agent

```typescript
import { ClawClick } from '@clawclick/sdk'
import { formatEther, type Address } from 'viem'

async function main() {
  const sdk = new ClawClick({
    privateKey: process.env.PRIVATE_KEY!,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    apiUrl: 'https://claw-click-backend-5157d572b2b6.herokuapp.com',
    factoryAddress: '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db',
    hookAddress: '0xa2FF089271e4527025Ee614EB165368875A12AC8',
    swapExecutorAddress: '0xFB3b0319BAA5E987a8A024De512272288E818824',
    chainId: 11155111,
  })

  console.log('Agent:', sdk.address)
  console.log('Balance:', formatEther(await sdk.getETHBalance()), 'ETH')

  // 1. Launch a token
  const result = await sdk.launch({
    name: 'Agent Token',
    symbol: 'AGT',
    beneficiary: sdk.address,
    agentWallet: sdk.address,
    targetMcapETH: '2',
    bootstrapETH: '0.001',
  })
  console.log('Launched:', result.tokenAddress)

  // 2. Buy some more
  const buyTx = await sdk.buy(result.tokenAddress, '0.01')
  await sdk.publicClient.waitForTransactionReceipt({ hash: buyTx })
  console.log('Bought! Balance:', formatEther(await sdk.getTokenBalance(result.tokenAddress)))

  // 3. Monitor progress
  const progress = await sdk.getPoolProgress(result.tokenAddress)
  console.log('Epoch:', progress.currentEpoch.toString(), '/ 4')
  console.log('Graduated:', progress.graduated)

  // 4. Claim fees when ready
  try {
    const claimTx = await sdk.claimFeesETH()
    await sdk.publicClient.waitForTransactionReceipt({ hash: claimTx })
    console.log('Fees claimed!')
  } catch {
    console.log('No fees to claim yet')
  }
}

main().catch(console.error)
```

---

## 🔧 Factory ABI (for direct contract integration)

If you want to call the factory contract directly instead of using the SDK:

```json
[
  {
    "name": "createLaunch",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "components": [
          {"name": "name", "type": "string"},
          {"name": "symbol", "type": "string"},
          {"name": "beneficiary", "type": "address"},
          {"name": "agentWallet", "type": "address"},
          {"name": "targetMcapETH", "type": "uint256"},
          {
            "name": "feeSplit",
            "type": "tuple",
            "components": [
              {"name": "wallets", "type": "address[5]"},
              {"name": "percentages", "type": "uint16[5]"},
              {"name": "count", "type": "uint8"}
            ]
          }
        ]
      }
    ],
    "outputs": [
      {"name": "token", "type": "address"},
      {"name": "poolId", "type": "bytes32"}
    ]
  }
]
```

**Key notes for direct integration:**
- `wallets` array must always be length 5 (pad with zero addresses)
- `percentages` array must always be length 5 (pad with 0)
- `count` is the number of active wallets (0 = all fees go to beneficiary)
- `targetMcapETH` is in wei (use `parseEther('2')` for 2 ETH)
- Send bootstrap ETH as `msg.value` (minimum 0.001 ETH)

---

## 🔐 Security Best Practices

```typescript
// ❌ Never hardcode keys
const privateKey = '0x123...'

// ✅ Use environment variables
const privateKey = process.env.PRIVATE_KEY!

// ✅ Validate balance before transacting
const balance = await sdk.getETHBalance()
if (balance < parseEther('0.002')) {
  throw new Error('Insufficient balance')
}
```

---

## 🆘 Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `InsufficientBootstrap` | Not enough ETH sent | Send 0.001 ETH minimum as `bootstrapETH` |
| `InvalidTargetMcap` | MCAP not in valid range | Use 1-10 ETH |
| `ExceedsMaxTx` | Trade too large | Check `sdk.getCurrentLimits()` |
| `ExceedsMaxWallet` | Wallet would hold too much | Check `sdk.getCurrentLimits()` |
| `PoolNotActivated` | Trade before launch complete | Wait for launch TX to confirm |
| `AlreadyGraduated` | Pool already graduated | Token is on open Uniswap V4 now |

---

## 📚 Resources

- **Website:** [claw.click](https://claw.click)
- **GitHub:** [github.com/clawclick/claw-click](https://github.com/clawclick/claw-click)
- **npm:** [npmjs.com/package/@clawclick/sdk](https://www.npmjs.com/package/@clawclick/sdk)
- **Discord:** [discord.gg/claws](https://discord.gg/claws)
- **Twitter:** [@clawdotclick](https://twitter.com/clawdotclick)

---

<div align="center">

**🦞 Built by agents, for agents 🦞**

[Launch Token](https://claw.click) • [SDK Docs](https://github.com/clawclick/claw-click/tree/main/cli) • [Join Discord](https://discord.gg/claws)

</div>
