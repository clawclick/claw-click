# Claw.Click - Agent-First Token Launchpad

**Revolutionary Multi-Position Progressive Liquidity System**

---

## What is Claw.Click?

Claw.Click is an agent-first token launchpad that enables AI agents to autonomously launch, manage, and monetize their own tokens on-chain. Built on Uniswap V4, it features a revolutionary 5-position progressive liquidity system that eliminates all manual intervention while providing smooth, capital-efficient price discovery from launch to infinity.

### Key Innovation: Zero Intervention

Unlike traditional launchpads that require constant rebalancing and management, Claw.Click's multi-position system automatically manages liquidity as your token grows:

- Launch with $2 - Minimal bootstrap requirement
- Auto-scaling liquidity - Positions mint as needed
- Capital recycling - ETH from old positions funds new ones
- Smooth transitions - 5% overlap prevents price gaps
- No intervention - Set it and forget it

---

## How It Works

### The 5-Position Progressive System

Your token's liquidity is managed through 5 concentrated positions, each covering 16x market cap growth (4 doublings):

| Position | Market Cap Range | Token Allocation | Mint Trigger |
|----------|------------------|------------------|--------------|
| P1 | $2,000 - $32,000 | 75.00% | Launch |
| P2 | $32,000 - $512,000 | 18.75% | P1 Epoch 2 |
| P3 | $512,000 - $8,000,000 | 4.69% | P2 Epoch 2 |
| P4 | $8,000,000 - $128,000,000 | 1.17% | P3 Epoch 2 |
| P5 | $128,000,000+ | 0.39% | P4 Epoch 2 |

### Launch Flow Example (Starting MCAP: $2,000)

#### Phase 1: Launch
- User provides: $2 bootstrap (0.001 ETH)
- System mints: Position 1 only (75% of tokens)
- Range: $2,000 - $32,000 MCAP
- Status: Pool immediately tradeable

#### Phase 2: P1 Trading (Hook Tax Active)
- Epoch 1 ($2k - $4k): 50% hook tax
- Epoch 2 ($4k - $8k): 25% tax, P2 mints automatically
- Epoch 3 ($8k - $16k): 12.5% tax, P3 mints automatically
- Epoch 4 ($16k - $32k): 6.25% tax

#### Phase 3: Graduation (At $32,000 MCAP)
- Hook tax disabled
- LP fee (1%) enabled
- Buy/sell limits removed
- Smooth transition to P2 (5% overlap)

#### Phase 4: Continued Growth
- P2 Epoch 1: P1 retires, ETH recycled into future positions
- P2 Epoch 2: P4 mints using recycled ETH
- P3 Epoch 1: P2 retires, more ETH recycled
- Pattern continues automatically

#### Phase 5: Final State (At $128M+ MCAP)
- P5 active (0.39% tokens, $64M+ range)
- P4 active as support (1.17% tokens)
- P1, P2, P3 retired and capital recycled
- Pure AMM with 1% LP fee only

---

## Key Features

### For Token Launchers

| Feature | Description |
|---------|-------------|
| Ultra-Low Barrier | Launch with just $2 (0.001 ETH) |
| Creator Privilege | Buy up to 15% tax-free within first minute |
| Agent-Native | Built specifically for AI agents to use autonomously |
| Zero Intervention | No manual rebalancing or management required |
| Automatic LP Locking | Security and trust built-in |
| Fee Earnings | Agents earn from their token's trading activity |

### For Traders

| Feature | Description |
|---------|-------------|
| Smooth Price Discovery | 5% overlap prevents liquidity gaps |
| Capital Efficient | Always concentrated at current price |
| Protected Launch Phase | Hook tax prevents sniping |
| Graduated Trading | Full DEX mode after graduation |
| Transparent | All mechanics on-chain and verifiable |

### For the Protocol

| Feature | Description |
|---------|-------------|
| Custom Contracts | 2.5x more fees than framework-based launchpads |
| Uniswap V4 Powered | Leverages advanced hook system |
| Battle-Tested Security | Reentrancy protection, access controls |
| Gas Optimized | 11% lifecycle gas savings vs alternatives |
| Multi-Chain Ready | Designed for cross-chain expansion |

---

## Why Multi-Position?

### The Problem with Traditional Bonding Curves

Traditional launchpads either use:

1. **Full-range liquidity** - Terrible capital efficiency, high slippage
2. **Single concentrated position** - Requires constant manual rebalancing
3. **Static bonding curves** - Can't adapt to market conditions

### Our Solution: Progressive Concentration

By using 5 pre-calculated positions with lazy minting and capital recycling, we achieve:

- Capital efficiency of concentrated liquidity
- Zero intervention of autonomous systems
- Smooth transitions of overlapping ranges
- Cost savings of lazy minting (no wasted gas on failed tokens)
- Long-term scalability from launch to billions in MCAP

---

## Economics

### Token Allocation Breakdown

| Position | Token % | MCAP Range | Coverage |
|----------|---------|------------|----------|
| P1 | 75.00% | $2k - $32k | 16x |
| P2 | 18.75% | $32k - $512k | 16x |
| P3 | 4.69% | $512k - $8M | 16x |
| P4 | 1.17% | $8M - $128M | 16x |
| P5 | 0.39% | $128M+ | Infinite |

### Fee Structure

#### Launch Phase (Pre-Graduation)

| Epoch | Tax Rate | Distribution |
|-------|----------|--------------|
| Epoch 1 | 50% | 70% to creator, 30% to platform |
| Epoch 2 | 25% | 70% to creator, 30% to platform |
| Epoch 3 | 12.5% | 70% to creator, 30% to platform |
| Epoch 4 | 6.25% | 70% to creator, 30% to platform |

#### Graduated Phase (Post-$32k MCAP)

| Type | Rate | Distribution |
|------|------|--------------|
| LP Fee | 1% | 100% to liquidity providers |
| Hook Tax | 0% | Disabled |
| Limits | None | Removed |

#### Fee Split Feature

Creators can split their 70% share across up to 5 different wallets with custom percentages.

**Example Configuration:**

| Wallet | Purpose | Share |
|--------|---------|-------|
| Developer | Development work | 30% |
| Marketing | Growth campaigns | 40% |
| Treasury | DAO funds | 10% |
| Advisor | Strategic guidance | 10% |
| Creator | Personal allocation | 10% |

**Rules:**
- Maximum 5 wallets
- Percentages must sum to 100%
- Platform 30% is never affected
- If no split configured, all 70% goes to beneficiary

### Gas Costs

| Action | Estimated Gas | Cost (30 gwei) |
|--------|--------------|----------------|
| Launch | ~350,000 | ~$3.50 |
| Swap | ~170,000 | ~$1.70 |
| Position Mint | ~280,000 | ~$2.80 |
| Position Retire | ~200,000 | ~$2.00 |

**Lifecycle Total:** ~19M gas (5 positions + 100 swaps)  
**11% cheaper** than comparable systems with manual rebalancing

---

## Getting Started

### For Users (Web Interface)

1. Visit claw.click
2. Connect your wallet (supports all major wallets)
3. Fill in token details:
   - Name
   - Symbol
   - Total supply (default: 1 billion tokens)
   - Starting market cap (1-10 ETH)
4. Send 0.001 ETH ($2) bootstrap liquidity
5. Click "Launch"
6. Creator Privilege: Buy up to 15% tax-free within first minute
7. Share your token

### For AI Agents (Programmatic)

See SKILL.md for the complete OpenClaw skill to launch tokens programmatically.

Example launch code:

```typescript
const bootstrap = ethers.utils.parseEther("0.001");

const tx = await factory.createLaunch(
  {
    name: "$AGENT",
    symbol: "AGENT",
    beneficiary: agentAddress,
    agentWallet: agentAddress,
    targetMcapETH: ethers.utils.parseEther("5")
  },
  { value: bootstrap }
);

await tx.wait();
console.log("Token launched successfully!");
```

---

## Security

### Audited Features

| Feature | Status |
|---------|--------|
| Access Control | Only Hook can manage positions |
| Reentrancy Protection | All external calls guarded |
| State Integrity | No double-minting or double-retirement |
| Capital Safety | All ETH tracked and accounted for |
| Graduation Safety | Irreversible, properly timed transitions |

### Testing Coverage

- Comprehensive unit tests
- Integration tests
- Fuzz testing (256 runs)
- Gas benchmarking
- Third-party audit (planned)

### Bug Bounty

We take security seriously. If you find a vulnerability, please report it to:

**Email:** security@claw.click  
**Rewards:** Up to $10,000 for critical findings

---

## Deployment

### Base Mainnet

**Status:** Live - All contracts verified  
**Network:** Base (Chain ID: 8453)

| Contract | Address |
|----------|---------|
| Factory | 0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a |
| Hook | 0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8 |
| Treasury | 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b |
| PoolManager | 0x498581fF718922c3f8e6A244956aF099B2652b2b (Uniswap V4) |
| PositionMgr | 0x7C5f5A4bBd8fD63184577525326123b519429bDc (Uniswap V4) |

View on Basescan: https://basescan.org/address/0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a

---

## Contributing

We welcome contributions! Please see:

- CONTRIBUTING.md - Contribution guidelines
- CODE_OF_CONDUCT.md - Community standards
- GitHub Issues - Current work

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

# Start development server
cd ../app
npm run dev
```

---

## Documentation

| Resource | Description |
|----------|-------------|
| Contracts README | Detailed contract documentation |
| SKILL.md | OpenClaw agent skill |
| API Docs | Programmatic interface |
| FAQ | Frequently asked questions |
| Whitepaper | Technical deep dive |

---

## Related Projects

### ClawClick Ecosystem

| Project | Description | Status |
|---------|-------------|--------|
| claw.click | Token Launchpad | Live |
| claw.locker | Multi-sig Agent Wallet | Coming Soon |
| claw.cfd | Prediction Markets & Perps Trading | Coming Soon |

---

## Connect

| Platform | Link |
|----------|------|
| Website | https://claw.click |
| Twitter | @clawdotclick |
| GitHub | github.com/clawclick |
| Discord | Join Community |

---

## License

MIT License - see LICENSE for details

---

## Acknowledgments

Built with:

| Technology | Purpose |
|-----------|---------|
| Uniswap V4 | Core AMM protocol |
| Foundry | Development framework |
| Next.js | Web interface |
| RainbowKit | Wallet connection |

Special thanks to the Uniswap Labs team for the incredible V4 architecture.

---

## Disclaimer

This software is provided "as is" without warranty of any kind. Cryptocurrency trading involves substantial risk. Always do your own research and never invest more than you can afford to lose.

---

**Built by agents, for agents**

Launch Now: https://claw.click
