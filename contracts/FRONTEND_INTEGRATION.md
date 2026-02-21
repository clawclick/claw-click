# Frontend Integration Guide - Claw.click Sepolia

**Last Updated:** February 21, 2026  
**Network:** Sepolia Testnet (Chain ID: 11155111)

---

## 📝 Contract Addresses

```javascript
export const SEPOLIA_CONTRACTS = {
  // Core Contracts
  FACTORY: "0x5C92E6f1Add9a2113C6977DfF15699e948e017Db",
  HOOK: "0xa2FF089271e4527025Ee614EB165368875A12AC8",
  CONFIG: "0x6049BCa2F8780fA7A929EBB8a9571C2D94bf5ee1",
  ROUTER: "0x501A262141E1b0C6103A760c70709B7631169d63",
  
  // Uniswap V4 (External)
  POOL_MANAGER: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  POSITION_MANAGER: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4",
};
```

---

## 📦 ABI Files

The following ABI files have been generated in the contracts directory:

1. **SEPOLIA_FACTORY_ABI.json** - Factory contract interface
2. **SEPOLIA_HOOK_ABI.json** - Hook contract interface  
3. **SEPOLIA_CONFIG_ABI.json** - Config contract interface

---

## 🎯 Key Events to Listen For

### 1. LaunchCreated (Factory)
```solidity
event LaunchCreated(
    address indexed token,
    address indexed beneficiary,
    address indexed creator,
    PoolId poolId,
    uint256 targetMcap,
    uint256 timestamp
);
```

**Use for:** New token launches, trending page, total launches counter

---

### 2. SwapExecuted (Hook)
```solidity
event SwapExecuted(
    PoolId indexed poolId,
    address indexed swapper,
    bool isBuy,
    uint256 currentMcap,
    uint256 epoch,
    uint256 taxBps,
    uint256 feeAmount,
    bool isETHFee
);
```

**Use for:** Volume tracking, activity feed, price updates

---

### 3. Graduated (Hook)
```solidity
event Graduated(
    address indexed token,
    PoolId indexed poolId,
    uint256 timestamp,
    uint256 finalMcap
);
```

**Use for:** Graduation badges, success metrics, milestone tracking

---

### 4. EpochAdvanced (Hook)
```solidity
event EpochAdvanced(
    PoolId indexed poolId,
    uint256 position,
    uint256 newEpoch,
    uint256 currentMCAP
);
```

**Use for:** Progress bars, tax decay indicators

---

### 5. PositionTransition (Hook)
```solidity
event PositionTransition(
    PoolId indexed poolId,
    uint256 newPosition
);
```

**Use for:** Multi-position progression tracking

---

## 📊 Key Read Functions

### Factory - Get Launch Info
```javascript
// Get launch info by pool ID
const launchInfo = await factoryContract.launchByPoolId(poolId);

// Returns:
// {
//   token: address,
//   beneficiary: address,
//   agentWallet: address,
//   creator: address,
//   poolId: bytes32,
//   poolKey: PoolKey,
//   targetMcapETH: uint256,
//   createdAt: uint256,
//   createdBlock: uint256,
//   name: string,
//   symbol: string,
//   feeSplit: FeeSplit
// }
```

### Hook - Get Current Stats
```javascript
// Get current MCAP
const mcap = await hookContract.getCurrentMcap(poolId);

// Get current tax
const taxBps = await hookContract.getCurrentTax(poolId);

// Get current epoch
const epoch = await hookContract.getCurrentEpoch(poolId);

// Check if graduated
const isGraduated = await hookContract.isGraduated(poolId);

// Get current limits (maxTx, maxWallet)
const [maxTx, maxWallet] = await hookContract.getCurrentLimits(poolId);
```

---

## 🔄 Event Indexing Setup

### Recommended Approach: Subgraph or The Graph

**Alternative: Direct Event Polling**

```javascript
import { ethers } from 'ethers';
import FACTORY_ABI from './SEPOLIA_FACTORY_ABI.json';

const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
const factoryContract = new ethers.Contract(
  SEPOLIA_CONTRACTS.FACTORY,
  FACTORY_ABI,
  provider
);

// Listen for new launches
factoryContract.on("LaunchCreated", (token, beneficiary, creator, poolId, targetMcap, timestamp) => {
  console.log("New token launched:", {
    token,
    beneficiary,
    creator,
    poolId,
    targetMcap,
    timestamp
  });
  
  // Update your database/state
});

// Historical events (last 1000 blocks)
const currentBlock = await provider.getBlockNumber();
const launchEvents = await factoryContract.queryFilter(
  factoryContract.filters.LaunchCreated(),
  currentBlock - 1000,
  currentBlock
);
```

---

## 📈 Stats Dashboard Integration

### 1. Total Volume (24h)
```javascript
// Query SwapExecuted events from last 24h
const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
const recentBlocks = await getBlockFromTimestamp(oneDayAgo);

const swapEvents = await hookContract.queryFilter(
  hookContract.filters.SwapExecuted(),
  recentBlocks,
  'latest'
);

const volume = swapEvents.reduce((total, event) => {
  return total + (event.args.isETHFee ? event.args.feeAmount : 0);
}, 0);
```

### 2. Tokens Launched (Total)
```javascript
// Query all LaunchCreated events
const launchEvents = await factoryContract.queryFilter(
  factoryContract.filters.LaunchCreated(),
  0,
  'latest'
);

const totalLaunches = launchEvents.length;
```

### 3. Trending Tokens
```javascript
// Get launches from last 24h, sort by swap count/volume
const recentLaunches = await factoryContract.queryFilter(
  factoryContract.filters.LaunchCreated(),
  recentBlocks,
  'latest'
);

// For each token, count swaps
const trendingTokens = await Promise.all(
  recentLaunches.map(async (launch) => {
    const poolId = launch.args.poolId;
    const swaps = await hookContract.queryFilter(
      hookContract.filters.SwapExecuted(poolId),
      recentBlocks,
      'latest'
    );
    
    return {
      token: launch.args.token,
      name: launchInfo.name,
      poolId,
      swapCount: swaps.length,
      volume: calculateVolume(swaps)
    };
  })
);

// Sort by volume/activity
trendingTokens.sort((a, b) => b.volume - a.volume);
```

---

## 🚀 Agent Programmatic Deployment

**Example: Agent creating a token via claw.click**

```javascript
import { ethers } from 'ethers';
import FACTORY_ABI from './SEPOLIA_FACTORY_ABI.json';

const wallet = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);
const factory = new ethers.Contract(
  SEPOLIA_CONTRACTS.FACTORY,
  FACTORY_ABI,
  wallet
);

// Create launch
const tx = await factory.createLaunch(
  {
    name: "MyAgentToken",
    symbol: "MAT",
    beneficiary: wallet.address,
    agentWallet: wallet.address,
    targetMcapETH: ethers.utils.parseEther("1"), // 1 ETH target
    feeSplit: {
      wallets: [ethers.constants.AddressZero, ...], // Empty for no split
      percentages: [0, 0, 0, 0, 0],
      count: 0
    }
  },
  {
    value: ethers.utils.parseEther("0.001") // Bootstrap liquidity
  }
);

const receipt = await tx.wait();
const launchEvent = receipt.events.find(e => e.event === 'LaunchCreated');

console.log("Token deployed:", launchEvent.args.token);
console.log("Pool ID:", launchEvent.args.poolId);
```

---

## 🧪 Testing Checklist

- [ ] Can fetch all launched tokens
- [ ] Can display token details (name, symbol, MCAP, epoch)
- [ ] Can track volume (24h, all-time)
- [ ] Can show trending tokens
- [ ] Can display graduated tokens
- [ ] Can show live stats (total launches, volume, users)
- [ ] Can handle real-time event updates
- [ ] Can show tax decay progress
- [ ] Can display position transitions (P1-P5)
- [ ] Can verify 5-wallet fee split (if configured)

---

## 📞 Support & Documentation

- **Deployment Log:** `SEPOLIA_DEPLOYMENT.md`
- **Contract Source:** `src/core/`
- **Sepolia Explorer:** https://sepolia.etherscan.io/

---

## ⚠️ Important Notes

1. **Tax Split Verification:** Check `feeSplit.count > 0` to detect multi-wallet fee distribution
2. **Position System:** Tokens progress through 5 positions (P1-P5), each with 4 epochs
3. **Graduation:** Occurs at end of P1 epoch 4 (16x MCAP growth from start)
4. **Creator First-Buy:** Creators have 1 minute to buy up to 15% tax-free
5. **Phase Transition:** P1 = hook tax, P2+ = LP fee only (1%)

---

**Ready to integrate!** 🎉
