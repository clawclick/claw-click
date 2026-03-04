# Claw.Click - Agent-First Token Launchpad

**Revolutionary Multi-Position Progressive Liquidity System**

[![Website](https://img.shields.io/badge/Website-claw.click-E8523D?style=for-the-badge)](https://claw.click)
[![Status](https://img.shields.io/badge/Status-LIVE-00D4AA?style=for-the-badge)]()
[![Network](https://img.shields.io/badge/Network-Base%20Mainnet-0052FF?style=for-the-badge)]()
[![Powered By](https://img.shields.io/badge/Powered%20By-Uniswap%20V4-FF007A?style=for-the-badge)]()

---

## What is Claw.Click?

Claw.Click is an **agent-first token launchpad** that enables AI agents to autonomously launch, manage, and monetize their own tokens on-chain. Built on Uniswap V4, it features a revolutionary **5-position progressive liquidity system** that eliminates all manual intervention while providing smooth, capital-efficient price discovery from launch to infinity.

### Key Innovation: Zero Intervention

Unlike traditional launchpads that require constant rebalancing and management, Claw.Click's multi-position system **automatically manages liquidity** as your token grows:

- **Launch with $2** - Minimal bootstrap requirement
- **Auto-scaling liquidity** - Positions mint as needed
- **Capital recycling** - ETH from old positions funds new ones
- **Smooth transitions** - 5% overlap prevents price gaps
- **No intervention** - Set it and forget it

---

## How It Works

### The 5-Position Progressive System

Your token's liquidity is managed through **5 concentrated positions**, each covering 16x market cap growth (4 doublings):

```
Position 1: 2k → 32k MCAP   (75.00% tokens) [Launch]
Position 2: 32k → 512k MCAP (18.75% tokens) [Mints at P1 Epoch 2]
Position 3: 512k → 8M MCAP  (4.69% tokens)  [Mints at P2 Epoch 2]
Position 4: 8M → 128M MCAP  (1.17% tokens)  [Mints at P3 Epoch 2]
Position 5: 128M → ∞ MCAP   (0.39% tokens)  [Mints at P4 Epoch 2]
```

### Launch Flow Example (2k Starting MCAP)

#### Phase 1: Launch
```
User provides: $2 bootstrap (0.001 ETH)
System mints: Position 1 only (75% of tokens)
Range: 2k → 32k MCAP
Status: Pool immediately tradeable
```

#### Phase 2: P1 Trading (Hook Tax Active)
```
Epoch 1 (2k→4k):   50% hook tax
Epoch 2 (4k→8k):   25% tax → P2 MINTS automatically
Epoch 3 (8k→16k):  12.5% tax → P3 MINTS automatically
Epoch 4 (16k→32k): 6.25% tax
```

#### Phase 3: Graduation
```
At 32k MCAP:
- Hook tax DISABLED
- LP fee (1%) ENABLED
- Buy/sell limits REMOVED
- Smooth transition to P2 (5% overlap)
```

#### Phase 4: Continued Growth
```
P2 Epoch 1: P1 RETIRES → ETH recycled into future positions
P2 Epoch 2: P4 MINTS using recycled ETH
P3 Epoch 1: P2 RETIRES → More ETH recycled
Pattern continues...
```

#### Phase 5: Final State
```
At 128M+ MCAP:
- P5 active (0.39% tokens, 64M→∞ range)
- P4 active as support (1.17% tokens)
- P1, P2, P3 retired and capital recycled
- Pure AMM with 1% LP fee only
```

---

## Key Features

### For Token Launchers

**Ultra-Low Barrier** - Launch with just $2 (0.001 ETH)  
**Creator Privilege** - Buy up to 15% tax-free within first minute  
**Agent-Native** - Built specifically for AI agents to use autonomously  
**Zero Intervention** - No manual rebalancing or management required  
**Automatic LP Locking** - Security and trust built-in  
**Fee Earnings** - Agents earn from their token's trading activity  

### For Traders

**Smooth Price Discovery** - 5% overlap prevents liquidity gaps  
**Capital Efficient** - Always concentrated at current price  
**Protected Launch Phase** - Hook tax prevents sniping  
**Graduated Trading** - Full DEX mode after graduation  
**Transparent** - All mechanics on-chain and verifiable  

### For the Protocol

**Custom Contracts** - 2.5x more fees than framework-based launchpads  
**Uniswap V4 Powered** - Leverages advanced hook system  
**Battle-Tested Security** - Reentrancy protection, access controls  
**Gas Optimized** - 11% lifecycle gas savings vs alternatives  
**Multi-Chain Ready** - Designed for cross-chain expansion  

---

## Why Multi-Position?

### The Problem with Traditional Bonding Curves

Traditional launchpads either use:
1. **Full-range liquidity** → Terrible capital efficiency, high slippage
2. **Single concentrated position** → Requires constant manual rebalancing
3. **Static bonding curves** → Can't adapt to market conditions

### Our Solution: Progressive Concentration

By using **5 pre-calculated positions** with **lazy minting** and **capital recycling**, we achieve:

- **Capital efficiency** of concentrated liquidity  
- **Zero intervention** of autonomous systems  
- **Smooth transitions** of overlapping ranges  
- **Cost savings** of lazy minting (no wasted gas on failed tokens)  
- **Long-term scalability** from launch to billions in MCAP  

---

## Technical Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Claw.Click System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Factory    │  │     Hook     │  │    Config    │     │
│  │              │  │              │  │              │     │
│  │ • Launch     │◄─┤ • Tax Tiers  │  │ • Constants  │     │
│  │ • Positions  │  │ • Epochs     │  │ • Allocations│     │
│  │ • Recycling  │─►│ • Graduation │  │ • Ranges     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                                │
│         ▼                  ▼                                │
│  ┌──────────────────────────────────────────┐             │
│  │      Uniswap V4 Pool Manager             │             │
│  │      + Position Manager (NFTs)           │             │
│  └──────────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Smart Contract Overview

See [`contracts/README.md`](contracts/README.md) for detailed contract documentation.

---

## Economics

### Token Allocation Breakdown

| Position | Tokens  | MCAP Range    | Coverage |
|----------|---------|---------------|----------|
| P1       | 75.00%  | 2k → 32k     | 16x      |
| P2       | 18.75%  | 32k → 512k   | 16x      |
| P3       | 4.69%   | 512k → 8M    | 16x      |
| P4       | 1.17%   | 8M → 128M    | 16x      |
| P5       | 0.39%   | 128M → ∞     | ∞        |

**Why geometric decay?**
- Matches Uniswap V2 constant product behavior
- Maintains consistent slippage across transitions
- Optimal capital efficiency at each price level

### Fee Structure

#### Launch Phase (Pre-Graduation)
```
Hook Tax (Buys Only):
- Epoch 1: 50%
- Epoch 2: 25%
- Epoch 3: 12.5%
- Epoch 4: 6.25%

Distribution:
- 70% to token creator (split across 1-5 wallets if configured)
- 30% to platform
```

#### Graduated Phase (Post-32k MCAP)
```
LP Fee: 1% (both buys and sells)
Hook Tax: Disabled
Limits: Removed

Distribution:
- 100% to liquidity providers
```

#### Fee Split Feature

**Split your creator revenue across multiple wallets!**

Creators can split their 70% share across up to **5 different wallets** with custom percentages:

```typescript
feeSplit: {
  wallets: ['0xDev', '0xMarketing', '0xTreasury', '0xAdvisor', '0xCreator'],
  percentages: [3000, 4000, 1000, 1000, 1000], // In basis points (must sum to 10000)
  count: 5
}
```

**Use Cases:**
- Agent teams splitting revenue
- DAO treasury allocations  
- Marketing budget automation
- Partner revenue sharing
- Development fund allocation

**Rules:**
- Up to 5 wallets maximum
- Percentages must sum to 10000 BPS (100% of creator's 70%)
- Platform 30% is never affected
- If count = 0, all 70% goes to beneficiary (default)

### Gas Costs

| Action | Est. Gas | Cost (@30 gwei) |
|--------|----------|-----------------|
| Launch | ~350k    | ~$3.50          |
| Swap   | ~170k    | ~$1.70          |
| Position Mint | ~280k | ~$2.80     |
| Position Retire | ~200k | ~$2.00   |

**Lifecycle Total:** ~19M gas (5 positions + 100 swaps)  
**11% cheaper** than comparable systems with manual rebalancing

---

## Getting Started

### For Users (Web Interface)

1. Visit [claw.click](https://claw.click)
2. Connect your wallet (supports all major wallets)
3. Fill in token details:
   - Name
   - Symbol
   - Total supply (default: 1B tokens)
   - Starting market cap (1-10 ETH)
4. Send 0.001 ETH ($2) bootstrap liquidity
5. Click "Launch"
6. **Creator Privilege:** Buy up to 15% tax-free within first minute!
7. Share your token!

### For AI Agents (Programmatic)

See [`SKILL.md`](SKILL.md) for the complete OpenClaw skill to launch tokens programmatically.

```typescript
// Example: Launch a token
const bootstrap = ethers.utils.parseEther("0.001");  // $2 bootstrap

const tx = await factory.createLaunch(
  {
    name: "$AGENT",
    symbol: "AGENT",
    beneficiary: agentAddress,
    agentWallet: agentAddress,
    targetMcapETH: ethers.utils.parseEther("5")  // 5 ETH starting MCAP
  },
  { value: bootstrap }
);

await tx.wait();
console.log("Token launched! Buy within 1 minute for 15% tax-free.");
```

---

## Security

### Audited Features

**Access Control** - Only Hook can manage positions  
**Reentrancy Protection** - All external calls guarded  
**State Integrity** - No double-minting or double-retirement  
**Capital Safety** - All ETH tracked and accounted for  
**Graduation Safety** - Irreversible, properly timed transitions  

### Testing

- Comprehensive unit tests
- Integration tests
- Fuzz testing (256 runs)
- Gas benchmarking
- Third-party audit (planned)

### Bug Bounty

We take security seriously. If you find a vulnerability, please report it to:
- **Email:** security@claw.click
- **Rewards:** Up to $10,000 for critical findings

---

## Deployment

### Base Mainnet

**Status:** Live • All contracts verified  
**Network:** Base (Chain ID: 8453)

```
Factory:       0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a
Hook:          0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8
Treasury:      0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
PoolManager:   0x498581fF718922c3f8e6A244956aF099B2652b2b (Uniswap V4)
PositionMgr:   0x7C5f5A4bBd8fD63184577525326123b519429bDc (Uniswap V4)
```

**[View on Basescan](https://basescan.org/address/0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a)**

Ecosystem Token: `$CC` (ClawClick) - Address TBA

---

## Contributing

We welcome contributions! Please see:

- [`CONTRIBUTING.md`](CONTRIBUTING.md) - Contribution guidelines
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) - Community standards
- [Open Issues](https://github.com/clawclick/claw-click/issues) - Current work

### Development Setup

```bash
# Clone the repository
git clone https://github.com/clawclick/claw-click.git
cd claw-click

# Install dependencies
npm install

# Compile contracts
cd contracts
forge install
forge build

# Run tests
forge test -vv

# Start development server (web app)
cd ../app
npm run dev
```

---

## Documentation

- **[Contracts README](contracts/README.md)** - Detailed contract documentation
- **[SKILL.md](SKILL.md)** - OpenClaw agent skill
- **[API Docs](docs/API.md)** - Programmatic interface
- **[FAQ](docs/FAQ.md)** - Frequently asked questions
- **[Whitepaper](docs/WHITEPAPER.md)** - Technical deep dive

---

## Related Projects

### ClawClick Ecosystem

- **[claw.click](https://claw.click)** - This project (Token Launchpad)
- **claw.locker** - Multi-sig Agent Wallet (Coming Soon)
- **claw.cfd** - Prediction Markets & Perps Trading (Coming Soon)

---

## Connect

- **Website:** [claw.click](https://claw.click)
- **Twitter:** [@clawdotclick](https://twitter.com/clawdotclick)
- **GitHub:** [clawclick](https://github.com/clawclick)
- **Discord:** [Join Community](https://discord.gg/claws)

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Acknowledgments

Built with:
- [Uniswap V4](https://uniswap.org) - Core AMM protocol
- [Foundry](https://getfoundry.sh) - Development framework
- [Next.js](https://nextjs.org) - Web interface
- [RainbowKit](https://rainbowkit.com) - Wallet connection

Special thanks to the Uniswap Labs team for the incredible V4 architecture.

---

## Disclaimer

This software is provided "as is" without warranty of any kind. Cryptocurrency trading involves substantial risk. Always do your own research and never invest more than you can afford to lose.

---

<div align="center">

**Built by agents, for agents**

[Launch Now](https://claw.click) • [Read Docs](docs/) • [Join Discord](https://discord.gg/claws)

</div>
