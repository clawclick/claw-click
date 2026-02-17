# Claw Click v4 Launchpad - System Overview

## What Is It?

Claw Click is a **fair-launch token launchpad** built on Uniswap v4. It lets anyone create a token with built-in anti-rug mechanics, automatic liquidity, and progressive decentralization as the token grows.

---

## Core Contracts

### 1. **ClawclickFactory.sol** - The Launch Engine
**What it does:** Creates tokens and manages their lifecycle.

**Key Functions:**
- `createLaunch()` - Creates a new ERC20 token with a Uniswap v4 pool
- `activatePool()` - First public buy mints liquidity and opens trading
- `activateAndSwapDev()` - Dev activation with tax-free buy (capped at 15%)
- `clearDevOverride()` - Dev disables their tax-free mode after buying
- `repositionByEpoch()` - Widens liquidity range as token grows

**What it holds:**
- All tokens (100% supply) until activation
- All LP NFTs (liquidity positions) forever
- ETH from launch fees

---

### 2. **ClawclickHook_V4.sol** - The Rule Enforcer
**What it does:** Uniswap v4 hook that enforces trading rules on every swap.

**Key Functions:**
- `beforeInitialize()` - Validates pool setup before it goes live
- `beforeSwap()` - Checks tax, limits, and activation state before every trade
- `afterSwap()` - Applies tax, distributes fees, tracks MCAP for milestones
- `registerLaunch()` - Stores launch parameters (MCAP target, tax rate, etc.)

**What it enforces:**
- **Tax:** 50% → 25% → 12.5% → 6.25% as MCAP grows (halves at 2x, 4x, 8x)
- **MaxTx:** 0.1% of supply (small launch) → 1% (large launch), scales with growth
- **MaxWallet:** Same as maxTx
- **Activation Block:** No trading until first buy activates the pool
- **Dev Override:** Tax-free path for devs (15% cap enforced)

**What it tracks:**
- Current MCAP vs. starting MCAP (for tax decay)
- Phase (PROTECTED → GRADUATED at 16x MCAP)
- Liquidity stage (epoch-based range expansion)

---

### 3. **ClawclickToken.sol** - The Token
**What it does:** Standard ERC20 with minting disabled after creation.

**Key Features:**
- Fixed supply: 1 billion tokens (1,000,000,000)
- Minted 100% to Factory on creation
- No mint, no burn, no owner controls
- Just a plain ERC20 that moves

---

### 4. **ClawclickConfig.sol** - The Settings Manager
**What it does:** Stores global settings and provides helper functions.

**Key Settings:**
- Launch fees (0.3 Ξ standard)
- Tax rates (50% base, decays with growth)
- Fee splits (70% to beneficiary, 30% to treasury)
- Min/Max MCAP for launches (1-10 ETH)
- Tick spacing for pools (200)

---

## How It Works: Token Lifecycle

### **Step 1: Launch Creation**
1. User calls `Factory.createLaunch()` with:
   - Token name & symbol
   - Target MCAP (1-10 ETH)
   - Beneficiary address (receives 70% of fees)
2. Factory:
   - Deploys ERC20 token (1B supply)
   - Creates Uniswap v4 pool (ETH/Token)
   - Initializes pool at calculated sqrtPrice
   - **NO LIQUIDITY ADDED YET**
   - Registers launch with Hook

**State after launch:**
- Token exists ✅
- Pool exists ✅
- Pool has NO liquidity ❌
- Trading is BLOCKED ❌
- Factory holds 100% of tokens ✅

---

### **Step 2: Activation (First Buy)**

#### **Option A: Public Activation**
- Anyone sends ETH to `Factory.activatePool()`
- Factory:
  1. Sets `poolActivated[poolId] = true`
  2. Mints balanced liquidity (ETH + tokens)
  3. Takes first swap at current price
  4. Buyer receives tokens (minus 50% tax)

#### **Option B: Dev Activation**
- Dev sends ETH to `Factory.activateAndSwapDev()`
- Factory:
  1. Sets `poolActivated[poolId] = true`
  2. Mints balanced liquidity
  3. Sets `activationInProgress = true` (tax-free mode)
- Dev swaps via Uniswap Universal Router
  - **No tax** (bypass enforced by hook)
  - **15% cap** enforced by Factory
- Dev calls `Factory.clearDevOverride()` when done

**State after activation:**
- Pool has liquidity ✅
- Trading is OPEN ✅
- LP NFT held by Factory ✅
- Tokens circulating (bought by first buyer)

---

### **Step 3: Trading & Tax Decay**

Every swap goes through the Hook:

**Before Swap:**
- Check: Is pool activated? (revert if no)
- Check: Is activationInProgress? (bypass limits if yes)
- Check: Does swap exceed maxTx? (revert if yes)

**After Swap:**
- Calculate tax based on current MCAP:
  - **2x MCAP reached?** Tax halves (50% → 25%)
  - **4x MCAP reached?** Tax halves again (25% → 12.5%)
  - **8x MCAP reached?** Tax halves again (12.5% → 6.25%)
- Deduct tax from buyer's tokens
- Split fees: 70% beneficiary, 30% treasury
- Update maxTx/maxWallet (scales with MCAP growth)

**Tax Math:**
```
currentMcap = ETH in pool / tokens in pool
growthRatio = currentMcap / startMcap

if growthRatio >= 8x → tax = baseTax / 8
else if growthRatio >= 4x → tax = baseTax / 4
else if growthRatio >= 2x → tax = baseTax / 2
else → tax = baseTax (50%)
```

---

### **Step 4: Graduation (16x MCAP)**

When MCAP reaches **16x** starting value:
- Phase changes: PROTECTED → GRADUATED
- Tax continues at 6.25% (doesn't go lower)
- Limits stay active
- Liquidity staging begins

---

### **Step 5: Liquidity Staging (Epoch-Based)**

As token grows, liquidity range expands:

**Stage 0 (Bootstrap):** Tight range around current price
- Tick range: ±200 ticks

**Stage 1:** Moderate range
- Triggered after 1 epoch of stability

**Stage 2:** Wide range
- Triggered after 2 epochs

**Stage 3:** Maximum range
- Final stage, fully mature liquidity

**How rebalancing works:**
- Owner calls `Factory.repositionByEpoch()`
- Factory:
  1. Removes old LP position
  2. Calculates new wider range based on current tick
  3. Mints new balanced position with wider range
  4. Stores new LP NFT ID

---

## Security Features

### **Anti-Rug Mechanics:**
1. **No owner controls** - Token has no admin functions
2. **LP locked forever** - Factory holds all LP NFTs (no withdrawal)
3. **Supply locked** - No minting, no burning
4. **Gradual decentralization** - Tax decays as MCAP grows
5. **Dev cap** - Devs limited to 15% max supply

### **Fair Launch:**
1. **No presale** - Token launches at market price
2. **No team allocation** - 100% supply available to market
3. **Automatic liquidity** - First buy creates liquidity
4. **Price discovery** - Uniswap v4 AMM handles pricing

---

## Key Parameters

| Setting | Value | Notes |
|---------|-------|-------|
| Total Supply | 1,000,000,000 | Fixed at creation |
| Launch Fee | 0.3 ETH | Standard (non-premium) |
| Min MCAP | 1 ETH | Minimum target MCAP |
| Max MCAP | 10 ETH | Maximum target MCAP |
| Base Tax | 50% | Decays with growth |
| Tax Halving | 2x, 4x, 8x | MCAP milestones |
| Graduation | 16x | Phase transition |
| Dev Cap | 15% | Max dev supply |
| Fee Split | 70/30 | Beneficiary/Treasury |
| MaxTx (1E MCAP) | 0.1% | 1M tokens |
| MaxTx (10E MCAP) | 1.0% | 10M tokens |

---

## Architecture: Uniswap v4 Integration

**Why v4?**
- **Hooks** - Custom logic on every swap (tax, limits, checks)
- **Singleton** - All pools share one contract (gas efficient)
- **Native ETH** - Direct ETH trading (no WETH wrapping)
- **Dynamic fees** - Hook can change fee based on conditions

**How it works:**
```
User → Universal Router → PoolManager → Hook → Factory
                                ↓
                            beforeSwap (check limits)
                                ↓
                            Swap executes
                                ↓
                            afterSwap (apply tax)
```

**Pool Structure:**
- **currency0:** Native ETH (address(0))
- **currency1:** Token (ERC20)
- **fee:** 0x800000 (dynamic fee flag)
- **tickSpacing:** 200
- **hooks:** ClawclickHook_V4 address

---

## Testing

**Test Suite:**
1. `01_TestLaunch.s.sol` - Launch creation, supply distribution, pool initialization
2. `02_TestPublicActivation.s.sol` - Activation state transitions, flag system
3. `03_TestDevActivation.s.sol` - Dev override path, 15% cap enforcement
4. (Future) Tax decay, graduation, limits scaling, fee claiming, liquidity staging

**Run Tests:**
```bash
forge script script/tests/01_TestLaunch.s.sol --rpc-url $SEPOLIA_RPC --broadcast
forge script script/tests/02_TestPublicActivation.s.sol --rpc-url $SEPOLIA_RPC --broadcast
```

---

## Deployed Contracts (Sepolia Testnet)

| Contract | Address |
|----------|---------|
| Config | `0xb79701ca4C72f1834109Dc96423cFc5ebAaFef54` |
| Hook | `0x958bD00Ac749dFC475FfdA401f97E83316d86AC8` |
| Factory | `0x9810ca87138a42e0a1D9E43734788bA97c70B6A8` |

**Uniswap v4 (Sepolia):**
- PoolManager: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- PositionManager: `0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4`
- UniversalRouter: `0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af`

---

## Quick Start: Launch a Token

```solidity
// 1. Approve Factory to spend launch fee
// 2. Call Factory.createLaunch()
ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
    name: "MyToken",
    symbol: "MTK",
    beneficiary: msg.sender,
    agentWallet: msg.sender,
    isPremium: false,
    targetMcapETH: 1 ether
});

(address token, PoolId poolId) = factory.createLaunch{value: 0.3 ether}(params);

// 3. Activate pool (first buy)
factory.activatePool{value: 0.1 ether}(poolKey);

// Done! Token is live and trading.
```

---

## Summary

**Claw Click v4 = Fair Launch + Auto-Liquidity + Progressive Decentralization**

- Anyone can create a token in one transaction
- First buy activates trading and creates liquidity
- Tax decays as token succeeds (50% → 6.25%)
- Limits scale with growth
- LP locked forever (anti-rug)
- No admin controls after launch

**Built for:** Memecoins, community tokens, fair launches
**Not for:** Tokens needing admin control, burn mechanisms, or complex tokenomics
