# Claw.Click OpenClaw Skill

## 🎯 Overview

This skill enables OpenClaw agents to autonomously launch, manage, and trade tokens on the Claw.Click launchpad built on Uniswap V4.

## 📦 Installation

Add this skill to your OpenClaw agent's skills directory or reference it directly:

```bash
# Via OpenClaw skill manager (when available)
openclaw skill install claw-click

# Or clone into your agent's skills directory
git clone https://github.com/clawclick/claw-click.git skills/claw-click
```

## 🔧 Contract Addresses

### Sepolia Testnet

```typescript
const CONTRACTS = {
  factory: '0x...', // ClawclickFactory
  hook: '0x...',    // ClawclickHook_V4
  config: '0x...',  // ClawclickConfig
  poolManager: '0x...', // Uniswap V4 PoolManager
  positionManager: '0x...', // Uniswap V4 PositionManager
}
```

### Mainnet (Q1 2026)

Coming soon on Base, Ethereum, and BSC.

---

## 🚀 Launching a Token

### Quick Start

```typescript
import { parseEther } from 'viem'

async function launchMyToken() {
  const factory = getContract(CONTRACTS.factory, factoryABI)
  
  const params = {
    name: "Agent Token",
    symbol: "AGT",
    beneficiary: await signer.getAddress(), // Your agent wallet
    agentWallet: await signer.getAddress(), // For claws.fun integration
    isPremium: false, // false = $0.70 fee, true = $2.30 fee
    targetMcapETH: parseEther('2') // Start at 2 ETH ($4k) MCAP
  }
  
  const tx = await factory.write.createLaunch(params, {
    value: parseEther('0.0013') // 0.001 ETH bootstrap + 0.0003 ETH micro fee
  })
  
  const receipt = await tx.wait()
  const tokenAddress = getTokenAddressFromLogs(receipt.logs)
  
  console.log('Token launched:', tokenAddress)
  return tokenAddress
}
```

### Parameters Explained

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `name` | string | Token name | Max 64 characters |
| `symbol` | string | Token symbol | Max 12 characters |
| `beneficiary` | address | Fee recipient (70% of trading fees) | Must be valid address |
| `agentWallet` | address | Agent wallet for claws.fun | Optional, can be same as beneficiary |
| `isPremium` | bool | Premium tier launch | false = $0.70, true = $2.30 |
| `targetMcapETH` | uint256 | Starting MCAP | Must be 1-10 ETH (whole numbers only) |

### Starting MCAP & Tax/Limits

Your chosen starting MCAP determines initial values:

| MCAP | Starting Tax | Starting Limits | Cost for 1% Bag |
|------|--------------|-----------------|-----------------|
| 1 ETH ($2k) | 50% | 0.1% of supply | ~$15 |
| 2 ETH ($4k) | 45% | 0.2% of supply | ~$29 |
| 5 ETH ($10k) | 30% | 0.5% of supply | ~$65 |
| 10 ETH ($20k) | 5% | 1.0% of supply | ~$105 |

**Tax decay:** Halves every MCAP doubling (epoch)  
**Limit expansion:** Scales proportionally with growth  
**Graduation:** At 16x starting MCAP (4 doublings)

### Factory ABI

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
          {"name": "isPremium", "type": "bool"},
          {"name": "targetMcapETH", "type": "uint256"}
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

---

## 💱 Trading Tokens

### Buying Tokens (ETH → Token)

```typescript
async function buyTokens(tokenAddress: string, ethAmount: string) {
  const poolManager = getContract(CONTRACTS.poolManager, poolManagerABI)
  const poolKey = await getPoolKey(tokenAddress)
  
  const swapParams = {
    zeroForOne: true, // ETH → Token (currency0 → currency1)
    amountSpecified: -parseEther(ethAmount), // Negative = exact input
    sqrtPriceLimitX96: 0n, // No slippage limit (use with caution)
  }
  
  const tx = await poolManager.write.swap(
    poolKey,
    swapParams,
    '0x', // No hook data needed
    {
      value: parseEther(ethAmount)
    }
  )
  
  const receipt = await tx.wait()
  const tokensReceived = parseTokensFromReceipt(receipt)
  
  return {
    tokensReceived,
    txHash: receipt.transactionHash
  }
}
```

### Selling Tokens (Token → ETH)

```typescript
async function sellTokens(tokenAddress: string, tokenAmount: string) {
  const token = getContract(tokenAddress, tokenABI)
  const poolManager = getContract(CONTRACTS.poolManager, poolManagerABI)
  
  // 1. Approve PoolManager to spend your tokens
  const approveTx = await token.write.approve(
    CONTRACTS.poolManager,
    parseEther(tokenAmount)
  )
  await approveTx.wait()
  
  // 2. Execute swap
  const poolKey = await getPoolKey(tokenAddress)
  
  const swapParams = {
    zeroForOne: false, // Token → ETH (currency1 → currency0)
    amountSpecified: -parseEther(tokenAmount), // Negative = exact input
    sqrtPriceLimitX96: 0n,
  }
  
  const tx = await poolManager.write.swap(
    poolKey,
    swapParams,
    '0x'
  )
  
  const receipt = await tx.wait()
  const ethReceived = parseETHFromReceipt(receipt)
  
  return {
    ethReceived,
    txHash: receipt.transactionHash
  }
}
```

### PoolManager Swap ABI

```json
[
  {
    "name": "swap",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      {
        "name": "key",
        "type": "tuple",
        "components": [
          {"name": "currency0", "type": "address"},
          {"name": "currency1", "type": "address"},
          {"name": "fee", "type": "uint24"},
          {"name": "tickSpacing", "type": "int24"},
          {"name": "hooks", "type": "address"}
        ]
      },
      {
        "name": "params",
        "type": "tuple",
        "components": [
          {"name": "zeroForOne", "type": "bool"},
          {"name": "amountSpecified", "type": "int256"},
          {"name": "sqrtPriceLimitX96", "type": "uint160"}
        ]
      },
      {"name": "hookData", "type": "bytes"}
    ],
    "outputs": [
      {
        "name": "delta",
        "type": "tuple",
        "components": [
          {"name": "amount0", "type": "int128"},
          {"name": "amount1", "type": "int128"}
        ]
      }
    ]
  }
]
```

---

## 💰 Claiming Your Fees

As a token creator (beneficiary), you earn 70% of all trading fees.

### Claim ETH Fees (from buys)

```typescript
async function claimETHFees() {
  const hook = getContract(CONTRACTS.hook, hookABI)
  const beneficiary = await signer.getAddress()
  
  // Check available fees
  const availableETH = await hook.read.beneficiaryFeesETH(beneficiary)
  console.log('Available ETH fees:', formatEther(availableETH))
  
  if (availableETH > 0n) {
    const tx = await hook.write.claimBeneficiaryFeesETH(beneficiary)
    await tx.wait()
    console.log('ETH fees claimed!')
  }
}
```

### Claim Token Fees (from sells)

```typescript
async function claimTokenFees(tokenAddress: string) {
  const hook = getContract(CONTRACTS.hook, hookABI)
  const beneficiary = await signer.getAddress()
  
  // Check available tokens
  const availableTokens = await hook.read.beneficiaryFeesToken(
    beneficiary,
    tokenAddress
  )
  console.log('Available token fees:', formatEther(availableTokens))
  
  if (availableTokens > 0n) {
    const tx = await hook.write.claimBeneficiaryFeesToken(
      beneficiary,
      tokenAddress
    )
    await tx.wait()
    console.log('Token fees claimed!')
  }
}
```

### Hook Fee Claiming ABIs

```json
[
  {
    "name": "beneficiaryFeesETH",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "beneficiary", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "name": "claimBeneficiaryFeesETH",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{"name": "beneficiary", "type": "address"}],
    "outputs": []
  },
  {
    "name": "beneficiaryFeesToken",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {"name": "beneficiary", "type": "address"},
      {"name": "token", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "name": "claimBeneficiaryFeesToken",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "beneficiary", "type": "address"},
      {"name": "token", "type": "address"}
    ],
    "outputs": []
  }
]
```

---

## 📊 Querying Token Status

### Get Complete Token Info

```typescript
async function getTokenStatus(tokenAddress: string) {
  const factory = getContract(CONTRACTS.factory, factoryABI)
  const hook = getContract(CONTRACTS.hook, hookABI)
  
  // Get launch info
  const launchInfo = await factory.read.launchByToken(tokenAddress)
  const poolId = launchInfo.poolId
  
  // Get current metrics
  const currentMcap = await hook.read.getCurrentMcap(poolId)
  const currentTax = await hook.read.getCurrentTax(poolId)
  const [maxTx, maxWallet] = await hook.read.getCurrentLimits(poolId)
  const epoch = await hook.read.getCurrentEpoch(poolId)
  const graduated = await hook.read.isGraduated(poolId)
  
  // Get launch details
  const launch = await hook.read.launches(poolId)
  
  return {
    // Token info
    tokenAddress,
    name: launchInfo.name,
    symbol: launchInfo.symbol,
    beneficiary: launch.beneficiary,
    
    // MCAP info
    startMcap: launch.startMcap,
    currentMcap,
    graduationMcap: launch.graduationMcap,
    
    // Current state
    phase: graduated ? 'GRADUATED' : 'PROTECTED',
    graduated,
    epoch: Number(epoch),
    
    // Taxes & Limits
    baseTax: launch.baseTax,
    currentTax,
    maxTx,
    maxWallet,
    
    // Timestamps
    createdAt: launchInfo.createdAt,
    createdBlock: launchInfo.createdBlock,
  }
}
```

### Hook Query ABIs

```json
[
  {
    "name": "getCurrentMcap",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "poolId", "type": "bytes32"}],
    "outputs": [{"name": "mcap", "type": "uint256"}]
  },
  {
    "name": "getCurrentTax",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "poolId", "type": "bytes32"}],
    "outputs": [{"name": "taxBps", "type": "uint256"}]
  },
  {
    "name": "getCurrentLimits",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "poolId", "type": "bytes32"}],
    "outputs": [
      {"name": "maxTx", "type": "uint256"},
      {"name": "maxWallet", "type": "uint256"}
    ]
  },
  {
    "name": "getCurrentEpoch",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "poolId", "type": "bytes32"}],
    "outputs": [{"name": "epoch", "type": "uint256"}]
  },
  {
    "name": "isGraduated",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "poolId", "type": "bytes32"}],
    "outputs": [{"name": "graduated", "type": "bool"}]
  }
]
```

---

## 🔧 Helper Functions

### Calculate Pool ID

```typescript
import { keccak256, encodeAbiParameters } from 'viem'

function calculatePoolId(tokenAddress: string): string {
  const poolKey = {
    currency0: '0x0000000000000000000000000000000000000000', // ETH
    currency1: tokenAddress,
    fee: 0x800000, // Dynamic fee flag (8388608)
    tickSpacing: 60,
    hooks: CONTRACTS.hook
  }
  
  const encoded = encodeAbiParameters(
    [
      {name: 'currency0', type: 'address'},
      {name: 'currency1', type: 'address'},
      {name: 'fee', type: 'uint24'},
      {name: 'tickSpacing', type: 'int24'},
      {name: 'hooks', type: 'address'}
    ],
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.fee,
      poolKey.tickSpacing,
      poolKey.hooks
    ]
  )
  
  return keccak256(encoded)
}
```

### Get Pool Key

```typescript
async function getPoolKey(tokenAddress: string) {
  const factory = getContract(CONTRACTS.factory, factoryABI)
  const launchInfo = await factory.read.launchByToken(tokenAddress)
  return launchInfo.poolKey
}
```

### Format Numbers

```typescript
function formatMCAP(mcap: bigint): string {
  const eth = Number(formatEther(mcap))
  if (eth >= 1000) return `$${(eth * 2000).toFixed(0)}k`
  return `$${(eth * 2000).toFixed(2)}`
}

function formatTax(bps: bigint): string {
  return `${Number(bps) / 100}%`
}

function formatLimits(amount: bigint): string {
  const pct = (Number(formatEther(amount)) / 10_000_000) * 100
  return `${pct.toFixed(2)}%`
}
```

---

## 🎨 Complete Example: Autonomous Agent

```typescript
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

class ClawClickAgent {
  private client: any
  private account: any
  
  constructor(privateKey: string) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`)
    this.client = createWalletClient({
      account: this.account,
      chain: sepolia,
      transport: http()
    })
  }
  
  async launch(name: string, symbol: string, startMcap: number = 2) {
    console.log(`🚀 Launching ${symbol}...`)
    
    const tokenAddress = await launchMyToken()
    console.log(`✅ Token launched: ${tokenAddress}`)
    
    return tokenAddress
  }
  
  async monitor(tokenAddress: string) {
    console.log(`👀 Monitoring ${tokenAddress}...`)
    
    setInterval(async () => {
      const status = await getTokenStatus(tokenAddress)
      
      console.log(`
📊 ${status.symbol} Status:
   MCAP: ${formatMCAP(status.currentMcap)}
   Epoch: ${status.epoch}/4
   Tax: ${formatTax(status.currentTax)}
   Phase: ${status.phase}
   ${status.graduated ? '🎓 GRADUATED!' : '🔒 Protected'}
      `)
      
      // Auto-claim if fees > $10
      await this.autoClaimFees(tokenAddress)
    }, 60000) // Every minute
  }
  
  async autoClaimFees(tokenAddress: string) {
    const ethFees = await hook.read.beneficiaryFeesETH(this.account.address)
    const tokenFees = await hook.read.beneficiaryFeesToken(
      this.account.address,
      tokenAddress
    )
    
    if (ethFees > parseEther('0.005')) {
      await claimETHFees()
      console.log('💰 Claimed ETH fees:', formatEther(ethFees))
    }
    
    if (tokenFees > parseEther('10000')) {
      await claimTokenFees(tokenAddress)
      console.log('💰 Claimed token fees:', formatEther(tokenFees))
    }
  }
  
  async trade(tokenAddress: string, isBuy: boolean, amount: string) {
    if (isBuy) {
      return await buyTokens(tokenAddress, amount)
    } else {
      return await sellTokens(tokenAddress, amount)
    }
  }
}

// Usage
const agent = new ClawClickAgent(process.env.PRIVATE_KEY!)
const token = await agent.launch("Agent Token", "AGT", 2)
await agent.monitor(token)
```

---

## 🔐 Security Best Practices

### 1. Private Key Management
```typescript
// ❌ Never hardcode keys
const privateKey = '0x123...'

// ✅ Use environment variables
const privateKey = process.env.PRIVATE_KEY

// ✅ Use key management services
const privateKey = await keyManager.getKey('agent-wallet')
```

### 2. Transaction Validation
```typescript
// Always validate before sending
async function safeLaunch(params) {
  // Check balance
  const balance = await client.getBalance({ address: account.address })
  if (balance < parseEther('0.002')) {
    throw new Error('Insufficient balance')
  }
  
  // Validate params
  if (params.targetMcapETH < 1 || params.targetMcapETH > 10) {
    throw new Error('Invalid MCAP (must be 1-10 ETH)')
  }
  
  // Proceed with launch
  return await launchToken(params)
}
```

### 3. Error Handling
```typescript
async function robustTrade(tokenAddress, isBuy, amount) {
  try {
    return await trade(tokenAddress, isBuy, amount)
  } catch (error) {
    if (error.message.includes('insufficient balance')) {
      console.error('Not enough funds')
    } else if (error.message.includes('slippage')) {
      console.error('Price moved too much, retry with higher slippage')
    } else {
      console.error('Trade failed:', error.message)
    }
    throw error
  }
}
```

---

## 📚 Additional Resources

- **[Documentation](https://claw.click/docs)** - Full system documentation
- **[README](https://claw.click/readme)** - Project overview
- **[GitHub](https://github.com/clawclick/claw-click)** - Source code
- **[Contracts](https://github.com/clawclick/claw-click/tree/main/contracts)** - Smart contract source

---

## 🆘 Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Insufficient Fee" | Not enough ETH sent | Send 0.0013 ETH minimum |
| "Invalid Target MCAP" | MCAP not 1-10 ETH or not whole number | Use 1, 2, 3, ..., 10 (no decimals) |
| "Start MCAP too low" | MCAP < 1 ETH | Minimum is 1 ETH |
| "Swap amount too small" | Below MIN_SWAP_AMOUNT | Use at least 0.0001 ETH/tokens |
| "Exceeds Max TX" | Buying/selling too much | Check getCurrentLimits() |
| "Exceeds Max Wallet" | Wallet would hold too much | Check getCurrentLimits() |
| "Pool not activated" | Trying to trade before launch complete | Wait for launch tx to confirm |

### Getting Help

- **Discord:** [discord.gg/claws](https://discord.gg/claws)
- **GitHub Issues:** [github.com/clawclick/claw-click/issues](https://github.com/clawclick/claw-click/issues)
- **Twitter:** [@clawdotclick](https://twitter.com/clawdotclick)

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built with:
- [Uniswap V4](https://uniswap.org) - Core AMM protocol
- [viem](https://viem.sh) - Ethereum library
- [Foundry](https://getfoundry.sh) - Smart contract framework

---

<div align="center">

**🦞 Built by agents, for agents 🦞**

[Launch Token](https://claw.click) • [Read Docs](https://claw.click/docs) • [Join Discord](https://discord.gg/claws)

</div>
