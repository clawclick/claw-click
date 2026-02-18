# Claw Click v4 Launchpad - System Overview

## What Is It?

Claw Click is a **fair-launch token launchpad** built on Uniswap v4. It lets anyone create a token with built-in anti-rug mechanics, automatic multi-position liquidity, and progressive decentralization as the token grows.

**NEW:** Multi-position progressive liquidity system that eliminates rebalancing through geometric token allocation across 5 price ranges.

---

## Core Innovation: Multi-Position Architecture

Instead of one liquidity position that needs constant rebalancing, Claw Click uses **5 pre-calculated positions** that activate as price grows:

| Position | MCAP Range | Token Allocation | Purpose |
|----------|-----------|------------------|---------|
| **P1** | Start → 16x | **75.00%** | Hook tax phase (epochs 1-4) |
| **P2** | 16x → 256x | **18.75%** | Post-graduation (LP fee active) |
| **P3** | 256x → 4,096x | **4.69%** | Growth phase |
| **P4** | 4,096x → 65,536x | **1.17%** | Maturity phase |
| **P5** | 65,536x → ∞ | **0.39%** | Final range to infinity |

**Key Benefits:**
- No rebalancing needed - positions are pre-calculated
- Capital efficient - old positions recycled as price grows
- Smooth transitions - 5% overlap between ranges
- Progressive activation - only mint positions as needed

---

## Core Contracts

### 1. **ClawclickFactory.sol** - The Launch Engine
**What it does:** Creates tokens and manages their multi-position lifecycle.

**Key Functions:**
- `createPool()` - Creates token + V4 pool + mints P1 position
- `mintNextPosition()` - Lazy minting triggered at epoch 2 of each position
- `retireOldPosition()` - Withdraws liquidity from old positions and recycles ETH
- (Removed: `rebalanceLiquidity()` - no longer needed)

**What it holds:**
- 25% of tokens (remaining after P1 allocation)
- All LP NFTs (5 positions maximum per pool)
- ETH from launch fees + recycled liquidity

**Position Management:**
- Mints P1 at launch (75% tokens + $2 bootstrap)
- Mints P2 when P1 reaches epoch 2 (halfway point)
- Continues pattern for P3, P4, P5
- Withdraws positions 2 steps behind (keeps 1 for support)
- Recycles ETH from old positions to boost new ones

---

### 2. **ClawclickHook_V4.sol** - The Rule Enforcer
**What it does:** Uniswap v4 hook that enforces trading rules ONLY during P1 (pre-graduation).

**Key Functions:**
- `beforeSwap()` - Applies hook tax ONLY in P1, bypassed in P2+
- `afterSwap()` - Tracks epochs, triggers position minting/retirement
- `registerLaunch()` - Stores launch parameters (starting MCAP, graduation threshold)

**What it enforces (P1 only):**
- **Hook Tax:** 50% → 25% → 12.5% → 6.25% (epochs 1-4)
- **MaxTx:** 0.1% → 1% of supply (scales with growth)
- **MaxWallet:** Same as maxTx
- **Activation Block:** No trading until first buy

**What it tracks:**
- Current position (1-5)
- Current epoch within position (1-4)
- MCAP milestones for epoch advancement
- Graduation status (triggered at end of P1)

**Post-Graduation (P2+):**
- Hook tax disabled ✅
- LP fee (1%) becomes active ✅
- Limits removed ✅
- Hook only tracks position transitions

---

### 3. **ClawclickToken.sol** - The Token
**What it does:** Standard ERC20 with minting disabled after creation.

**Key Features:**
- Fixed supply: 1 billion tokens (1,000,000,000)
- Initially minted to Factory for position allocation
- No mint, no burn, no owner controls
- Plain ERC20 with transfer mechanics

---

### 4. **ClawclickConfig.sol** - The Settings Manager
**What it does:** Stores global settings and provides helper functions.

**Key Settings:**
- Launch fees ($2 minimum for bootstrap)
- Tax rates (50% base, decays in P1)
- Fee splits (70% beneficiary, 30% treasury)
- Position overlap percentage (5%)
- Token allocations (75%, 18.75%, 4.69%, 1.17%, 0.39%)

---

## How It Works: Token Lifecycle

### **Step 1: Launch Creation**
1. User calls `Factory.createPool()` with:
   - Token name & symbol
   - Starting MCAP (e.g., 2k, 20k, 200k)
   - **0.001 ETH ($2) bootstrap fee**
2. Factory:
   - Deploys ERC20 token (1B supply)
   - Creates Uniswap v4 pool (ETH/Token)
   - Calculates P1 tick range [Start → 16x Start]
   - Mints P1 with 75% tokens + $2 bootstrap
   - Position is ~99.99% tokens, ~0.01% ETH (just sets price)

**State after launch:**
- Token exists ✅
- Pool exists ✅
- P1 has liquidity (75% tokens) ✅
- Trading is OPEN ✅
- Price is set at starting MCAP ✅

**Critical:** The $2 bootstrap ONLY sets initial price. Real liquidity depth comes from the 75% token concentration in the [Start → 16x] range.

---

### **Step 2: Trading & Epoch Progression**

**Every swap goes through the Hook:**

**Position 1 - Pre-Graduation Phase:**
- **Epoch 1** (Start → 2x MCAP): 50% hook tax
- **Epoch 2** (2x → 4x MCAP): 25% hook tax, **P2 minted**
- **Epoch 3** (4x → 8x MCAP): 12.5% hook tax
- **Epoch 4** (8x → 16x MCAP): 6.25% hook tax
- **End of Epoch 4:** GRADUATION triggers

**Hook Logic:**
```solidity
// In afterSwap:
uint256 currentMCAP = _calculateMCAP(poolId);

// Check for epoch doubling
if (currentMCAP >= lastEpochMCAP * 2) {
    currentEpoch++;
    
    // Epoch 2: Lazy mint next position
    if (currentEpoch == 2) {
        factory.mintNextPosition(poolId, currentPosition + 1);
    }
    
    // Epoch 4 → Epoch 1: Move to next position
    if (currentEpoch > 4) {
        currentPosition++;
        currentEpoch = 1;
        
        // P3+: Retire position 2 steps back
        if (currentPosition >= 3) {
            factory.retireOldPosition(poolId, currentPosition - 2);
        }
    }
}
```

**Tax Calculation:**
```solidity
uint256 baseTax = 5000; // 50%

if (currentEpoch == 4) tax = baseTax / 8;      // 6.25%
else if (currentEpoch == 3) tax = baseTax / 4; // 12.5%
else if (currentEpoch == 2) tax = baseTax / 2; // 25%
else tax = baseTax;                             // 50%
```

---

### **Step 3: Graduation (16x MCAP)**

**When P1 Epoch 4 ends (price reaches 16x starting MCAP):**

**Before Graduation:**
- Position: P1 only
- Hook tax: 6.25% (active)
- LP fee: 0%
- Max wallet: Active
- Max tx: Active

**After Graduation:**
- Position: P2 becomes active (P1 stays as support)
- Hook tax: **DISABLED** ✅
- LP fee: **1% ACTIVE** ✅
- Max wallet: **REMOVED** ✅
- Max tx: **REMOVED** ✅

**Implementation:**
```solidity
// In Hook's afterSwap:
if (currentPosition == 1 && currentEpoch == 4 && currentMCAP >= graduationMCAP) {
    graduated[poolId] = true;
    emit Graduation(poolId, currentMCAP, block.timestamp);
}

// In beforeSwap:
if (!graduated[poolId]) {
    // Apply hook tax, enforce limits
} else {
    // Skip - LP fee handles everything now
}
```

**Why it's smooth:**
- P2 was already minted at P1 Epoch 2 (halfway point)
- 5% overlap means P2 starts at 0.95 × 16x MCAP
- Price walks seamlessly from P1 into P2
- No liquidity migration needed

---

### **Step 4: Position Retirement & Capital Recycling**

**As token grows, old positions are withdrawn and ETH recycled:**

**Position Flow:**
```
Launch: Mint P1 (75% tokens)
↓
P1 Epoch 2 (4x MCAP): Mint P2 (18.75% tokens)
↓
P1 Epoch 4 → P2 Epoch 1 (16x MCAP): Graduation, P1 stays active
↓
P2 Epoch 2 (64x MCAP): Mint P3 (4.69% tokens)
↓
P3 Epoch 1 (256x MCAP): WITHDRAW P1, recycle ~4 ETH into future positions
↓
P3 Epoch 2 (512x MCAP): Mint P4 (1.17% tokens)
↓
P4 Epoch 1 (4,096x MCAP): WITHDRAW P2, recycle ETH
↓
P4 Epoch 2 (16,384x MCAP): Mint P5 (0.39% tokens)
↓
P5 Epoch 1 (65,536x MCAP): WITHDRAW P3, recycle ETH
```

**Always maintain 2 active positions:**
- Current position (where price is)
- Previous position (support in case of dip)

**Example:**
- At P3: P3 is active, P2 is support, P1 withdrawn
- At P4: P4 is active, P3 is support, P2 withdrawn

---

### **Step 5: Position Overlap - Smooth Transitions**

**5% overlap prevents liquidity gaps:**

```
P1: [2k ============= 33.6k]
P2:              [30.4k ============= 537.6k]
                  └─ overlap ─┘
```

**How V4 handles overlaps:**
- When price is in overlap zone, V4 uses liquidity from BOTH positions
- Provides extra depth during transitions
- Prevents slippage spikes at boundaries
- Works automatically via V4's multi-position logic

**Tick Calculation:**
```solidity
// P1
tickLower_P1 = tickAt(startMCAP)
tickUpper_P1 = tickAt(startMCAP × 16 × 1.05)  // +5% extension

// P2
tickLower_P2 = tickAt(startMCAP × 16 × 0.95)  // -5% early start
tickUpper_P2 = tickAt(startMCAP × 256 × 1.05)
```

---

## Position Allocation Math

**Geometric Decay:** Each 4-doubling block (16x MCAP) consumes ~75% of liquidity in that position.

**Derivation:**
- V2 constant product: `x * y = k`
- To double price: ETH increases by √2, tokens decrease by 1/√2
- After 4 doublings: (1/√2)^4 = 0.25 → 25% tokens remain, 75% sold

**Applied to 5 positions:**
- P1: 100% → sells 75% → 25% remains
- P2: 25% → sells 75% of 25% → 6.25% remains
- P3: 6.25% → sells 75% → 1.5625% remains
- P4: 1.5625% → sells 75% → 0.390625% remains
- P5: 0.390625% → sells towards 0

**Position allocations:**
- P1: 75.0000%
- P2: 18.7500% (25% - 6.25%)
- P3: 4.6875% (6.25% - 1.5625%)
- P4: 1.1719% (1.5625% - 0.390625%)
- P5: 0.3906% (final remainder)

Total: 100.0000% ✅

---

## Security Features

### **Anti-Rug Mechanics:**
1. **No owner controls** - Token has no admin functions after deployment
2. **LP locked in Factory** - All 5 position NFTs held permanently
3. **Supply locked** - No minting, no burning
4. **Progressive decentralization** - Tax only in P1, then pure AMM
5. **Capital recycling** - Old positions withdrawn by contract, not owner

### **Fair Launch:**
1. **Minimal entry cost** - $2 bootstrap vs traditional liquidity requirements
2. **No presale** - Token launches at market price
3. **No team allocation** - 100% supply in positions (accessible to market)
4. **Automatic liquidity** - All positions managed by contract
5. **Price discovery** - Uniswap v4 AMM handles pricing

### **Capital Efficiency:**
1. **No rebalancing** - Positions pre-calculated, never modified
2. **Lazy minting** - Only create positions as needed
3. **Position retirement** - Recycle idle ETH into active ranges
4. **Support positions** - Keep 1 position below for dip protection

---

## Key Parameters

| Setting | Value | Notes |
|---------|-------|-------|
| Total Supply | 1,000,000,000 | Fixed at creation |
| Bootstrap Fee | 0.001 ETH ($2) | Initializes price, reduces spam |
| Position Overlap | 5% | Smooth transitions between ranges |
| Positions | 5 | P1 → P2 → P3 → P4 → P5 |
| Base Hook Tax | 50% | P1 only, decays to 6.25% |
| LP Fee | 1% | P2+ only, standard Uniswap fee |
| Graduation | 16x MCAP | End of P1 epoch 4 |
| Position Retirement | Current - 2 | Recycle when 2 positions ahead |
| Fee Split | 70/30 | Beneficiary/Treasury |
| MaxTx/Wallet | 0.1% → 1% | P1 only, scales with growth |

---

## Position Examples

### **Example 1: 2k Starting MCAP**
- P1: 2k → 32k (epochs 1-4, hook tax)
- P2: 32k → 512k (graduation, LP fee)
- P3: 512k → 8M
- P4: 8M → 128M
- P5: 128M → ∞

### **Example 2: 20k Starting MCAP**
- P1: 20k → 320k
- P2: 320k → 5.12M
- P3: 5.12M → 81.92M
- P4: 81.92M → 1.31B
- P5: 1.31B → ∞

### **Example 3: 200k Starting MCAP**
- P1: 200k → 3.2M
- P2: 3.2M → 51.2M
- P3: 51.2M → 819.2M
- P4: 819.2M → 13.1B
- P5: 13.1B → ∞

**All use same token allocations:** 75%, 18.75%, 4.69%, 1.17%, 0.39%

---

## Architecture: Uniswap v4 Integration

**Why v4?**
- **Hooks** - Custom logic on every swap (tax in P1, tracking)
- **Singleton** - All pools share one contract (gas efficient)
- **Native ETH** - Direct ETH trading (no WETH wrapping)
- **Multi-position support** - Can utilize multiple ranges simultaneously

**How it works:**
```
User → Universal Router → PoolManager → Hook → Factory
                                ↓
                        beforeSwap (P1: apply tax)
                                ↓
                        Swap executes (uses active positions)
                                ↓
                        afterSwap (track epochs, trigger minting)
```

**Pool Structure:**
- **currency0:** Native ETH (address(0))
- **currency1:** Token (ERC20)
- **fee:** 1% (becomes active at graduation)
- **tickSpacing:** 60 (standard for 1% tier)
- **hooks:** ClawclickHook_V4 address

---

## Quick Start: Launch a Token

```solidity
// 1. Call Factory.createPool() with $2 bootstrap
ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
    name: "MyToken",
    symbol: "MTK",
    beneficiary: msg.sender,
    agentWallet: msg.sender,
    startingMCAP: 2000  // 2k starting MCAP
});

(address token, PoolId poolId) = factory.createPool{value: 0.001 ether}(params);

// Done! Token is live with P1 active.
// P2-P5 will mint automatically as price grows.
```

---

## Summary

**Claw Click v4 = Fair Launch + Multi-Position Liquidity + Zero Rebalancing**

- **$2 to launch** - Lowest barrier to entry
- **5 pre-calculated positions** - Progressive activation as price grows
- **No rebalancing needed** - Positions never modified after creation
- **Capital efficient** - Old positions recycled into new ones
- **Hook tax in P1 only** - Pure AMM after graduation
- **LP locked forever** - All positions held by Factory (anti-rug)
- **Smooth transitions** - 5% overlap prevents liquidity gaps

**Built for:** Fair launches, memecoins, community tokens
**Not for:** Tokens needing admin control, burn mechanisms, or complex tokenomics

**Gas Savings vs Old System:**
- No rebalancing transactions ✅
- Lazy minting (only create what's needed) ✅
- One-time position creation (no modifications) ✅

---

**Architecture Status:** Locked In ✅
**Implementation:** In Progress 🚧
**Last Updated:** 2026-02-18
