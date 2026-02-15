# 🎯 TAX, LIMITS, AND POSITION MANAGEMENT - COMPLETE EXPLANATION

**Date:** February 15, 2026  
**Contract:** ClawclickHook_V4.sol

---

## ⚠️ CORRECTION TO DOCUMENTATION

You are **CORRECT** - the documentation had an error. Let me clarify the actual implementation:

### Transaction Limits Logic (CORRECT)
- **Lower MCAP = TIGHTER limits** (anti-bot protection)
- **Higher MCAP = LOOSER limits** (allows natural growth)

**Formula:** `limitBps = (0.1% * growthRatio)`

This is **ANTI-BOT** logic: Small launches need protection, growing launches earn freedom.

---

## 📊 TAX TIERS (Hard-Coded in Config Constructor)

### Starting Tax Based on Target MCAP

```solidity
// From ClawclickConfig.sol _initializeTaxTiers()
taxTiers[1 ether]  = 5000;  // 50%
taxTiers[2 ether]  = 4500;  // 45%
taxTiers[3 ether]  = 4000;  // 40%
taxTiers[4 ether]  = 3500;  // 35%
taxTiers[5 ether]  = 3000;  // 30%
taxTiers[6 ether]  = 2500;  // 25%
taxTiers[7 ether]  = 2000;  // 20%
taxTiers[8 ether]  = 1500;  // 15%
taxTiers[9 ether]  = 1000;  // 10%
taxTiers[10 ether] = 500;   // 5%
```

**🔒 SECURITY:** Tax tiers are **IMMUTABLE** after Config deployment. Cannot be changed by owner. This guarantees users have deterministic, unchangeable tax rates.

**⚠️ Note:** Hook also has internal `_getBaseTaxForMcap()` function with slightly different tiers. Need to reconcile or remove one.

---

## 🔢 EPOCH SYSTEM (Tax Decay Mechanism)

### What is an Epoch?

An **epoch** represents how many times the token's MCAP has **doubled** from its starting MCAP.

```solidity
epoch = floor(log2(currentMcap / startMcap))
```

**Examples:**

| Current MCAP | Start MCAP | Growth | Epoch |
|--------------|------------|--------|-------|
| 1 ETH | 1 ETH | 1x | 0 |
| 2 ETH | 1 ETH | 2x | 1 |
| 4 ETH | 1 ETH | 4x | 2 |
| 8 ETH | 1 ETH | 8x | 3 |
| 16 ETH | 1 ETH | 16x | 4 |
| 32 ETH | 1 ETH | 32x | 4 (capped) |

**Implementation:**
```solidity
function _getEpoch(uint256 currentMcap, uint256 startMcap) internal pure returns (uint256 epoch) {
    if (currentMcap <= startMcap) return 0;
    
    uint256 ratio = currentMcap / startMcap;
    epoch = 0;
    
    // Count doublings, capped at GRADUATION_EPOCH (4)
    while (ratio >= 2 && epoch < GRADUATION_EPOCH) {
        ratio /= 2;
        epoch++;
    }
    
    // Defensive cap
    if (epoch > GRADUATION_EPOCH) {
        epoch = GRADUATION_EPOCH;
    }
}
```

---

## 💰 TAX CALCULATION (Progressive Decay)

### Formula

```solidity
tax = baseTax / (2^epoch)
floor = 1% (TAX_FLOOR_BPS = 100)
```

### Implementation

```solidity
function _calculateTax(uint256 baseTax, uint256 epoch) internal pure returns (uint256 taxBps) {
    // Bit shift is equivalent to division by 2^epoch
    taxBps = baseTax >> epoch;
    
    // Floor at 1%
    if (taxBps < TAX_FLOOR_BPS) {
        taxBps = TAX_FLOOR_BPS;
    }
}
```

---

## 📈 COMPLETE TAX EXAMPLES (1-10 ETH Starting MCAP)

### 1 ETH Starting MCAP (50% base tax)

| Current MCAP | Epoch | Calculation | Tax | Notes |
|--------------|-------|-------------|-----|-------|
| 1 ETH | 0 | 50% / 2^0 | **50.0%** | Launch |
| 2 ETH | 1 | 50% / 2^1 | **25.0%** | First doubling |
| 4 ETH | 2 | 50% / 2^2 | **12.5%** | Second doubling |
| 8 ETH | 3 | 50% / 2^3 | **6.25%** | Third doubling |
| 16 ETH | 4 | 50% / 2^4 | **3.125%** → **1.0%** | Graduation threshold (floor) |
| 32 ETH+ | 4 | — | **1.0%** | Sustained 1hr → **GRADUATED** |

**Post-Graduation:** Hook tax = **0%**, Pool fee switches to **1%**

---

### 2 ETH Starting MCAP (45% base tax)

| Current MCAP | Epoch | Calculation | Tax | Notes |
|--------------|-------|-------------|-----|-------|
| 2 ETH | 0 | 45% / 2^0 | **45.0%** | Launch |
| 4 ETH | 1 | 45% / 2^1 | **22.5%** | First doubling |
| 8 ETH | 2 | 45% / 2^2 | **11.25%** | Second doubling |
| 16 ETH | 3 | 45% / 2^3 | **5.625%** | Third doubling |
| 32 ETH | 4 | 45% / 2^4 | **2.8125%** → **1.0%** | Graduation threshold (floor) |
| 64 ETH+ | 4 | — | **1.0%** | Sustained 1hr → **GRADUATED** |

---

### 5 ETH Starting MCAP (30% base tax)

| Current MCAP | Epoch | Calculation | Tax | Notes |
|--------------|-------|-------------|-----|-------|
| 5 ETH | 0 | 30% / 2^0 | **30.0%** | Launch |
| 10 ETH | 1 | 30% / 2^1 | **15.0%** | First doubling |
| 20 ETH | 2 | 30% / 2^2 | **7.5%** | Second doubling |
| 40 ETH | 3 | 30% / 2^3 | **3.75%** | Third doubling |
| 80 ETH | 4 | 30% / 2^4 | **1.875%** → **1.0%** | Graduation threshold (floor) |
| 160 ETH+ | 4 | — | **1.0%** | Sustained 1hr → **GRADUATED** |

---

### 10 ETH Starting MCAP (5% base tax)

| Current MCAP | Epoch | Calculation | Tax | Notes |
|--------------|-------|-------------|-----|-------|
| 10 ETH | 0 | 5% / 2^0 | **5.0%** | Launch |
| 20 ETH | 1 | 5% / 2^1 | **2.5%** | First doubling |
| 40 ETH | 2 | 5% / 2^2 | **1.25%** | Second doubling |
| 80 ETH | 3 | 5% / 2^3 | **0.625%** → **1.0%** | Floor applied |
| 160 ETH | 4 | — | **1.0%** | Graduation threshold |
| 320 ETH+ | 4 | — | **1.0%** | Sustained 1hr → **GRADUATED** |

---

## 🚧 TRANSACTION LIMITS (Anti-Bot Protection)

### Formula

```solidity
growthRatio = currentMcap / startMcap
limitBps = (0.1% * growthRatio)
minimum = 0.1%

maxTx = (TOTAL_SUPPLY * limitBps) / 10000
maxWallet = maxTx (same)
```

### Implementation

```solidity
function _getMaxTx(uint256 currentMcap, uint256 startMcap) internal pure returns (uint256 maxTx) {
    uint256 growthRatio = (currentMcap * BPS) / startMcap;  // Scale by BPS for precision
    uint256 limitBps = (BASE_LIMIT_BPS * growthRatio) / BPS;
    
    // Minimum 0.1%
    if (limitBps < BASE_LIMIT_BPS) {
        limitBps = BASE_LIMIT_BPS;
    }
    
    maxTx = (TOTAL_SUPPLY * limitBps) / BPS;
}
```

**Constants:**
- `TOTAL_SUPPLY = 1,000,000,000 * 10^18` (1 billion tokens)
- `BASE_LIMIT_BPS = 10` (0.1%)
- `BPS = 10000` (basis points denominator)

---

## 📊 COMPLETE LIMIT EXAMPLES (1-10 ETH Starting MCAP)

### 1 ETH Starting MCAP

| Current MCAP | Growth Ratio | Limit BPS | Max Tx/Wallet | Notes |
|--------------|--------------|-----------|---------------|-------|
| 1 ETH | 1.0x | 0.1% | **1,000,000** tokens | Launch (tight) |
| 2 ETH | 2.0x | 0.2% | **2,000,000** tokens | Doubles |
| 4 ETH | 4.0x | 0.4% | **4,000,000** tokens | Quadruples |
| 8 ETH | 8.0x | 0.8% | **8,000,000** tokens | 8x |
| 16 ETH | 16.0x | 1.6% | **16,000,000** tokens | Graduation |
| 32 ETH+ | 32.0x+ | **NO LIMIT** | **∞** | Post-graduation |

---

### 5 ETH Starting MCAP

| Current MCAP | Growth Ratio | Limit BPS | Max Tx/Wallet | Notes |
|--------------|--------------|-----------|---------------|-------|
| 5 ETH | 1.0x | 0.1% | **1,000,000** tokens | Launch (tight) |
| 10 ETH | 2.0x | 0.2% | **2,000,000** tokens | Doubles |
| 20 ETH | 4.0x | 0.4% | **4,000,000** tokens | Quadruples |
| 40 ETH | 8.0x | 0.8% | **8,000,000** tokens | 8x |
| 80 ETH | 16.0x | 1.6% | **16,000,000** tokens | Graduation |
| 160 ETH+ | 32.0x+ | **NO LIMIT** | **∞** | Post-graduation |

---

### 10 ETH Starting MCAP

| Current MCAP | Growth Ratio | Limit BPS | Max Tx/Wallet | Notes |
|--------------|--------------|-----------|---------------|-------|
| 10 ETH | 1.0x | 0.1% | **1,000,000** tokens | Launch (tight) |
| 20 ETH | 2.0x | 0.2% | **2,000,000** tokens | Doubles |
| 40 ETH | 4.0x | 0.4% | **4,000,000** tokens | Quadruples |
| 80 ETH | 8.0x | 0.8% | **8,000,000** tokens | 8x |
| 160 ETH | 16.0x | 1.6% | **16,000,000** tokens | Graduation |
| 320 ETH+ | 32.0x+ | **NO LIMIT** | **∞** | Post-graduation |

---

## 🎓 GRADUATION MECHANICS

### Trigger Conditions

**Both required:**
1. **Epoch >= 4** (16x growth from start)
2. **Sustained for 1 hour** (anti-manipulation)

### Implementation

```solidity
function _checkGraduation(PoolId poolId, uint256 epoch) internal {
    Launch storage launch = launches[poolId];
    
    // Already graduated
    if (launch.phase == Phase.GRADUATED) return;
    
    // Check if at graduation threshold
    if (epoch >= GRADUATION_EPOCH) {
        // Start timer if not already started
        if (launch.aboveThresholdSince == 0) {
            launch.aboveThresholdSince = block.timestamp;
        }
        // Check if sustained for required duration
        else if (block.timestamp >= launch.aboveThresholdSince + GRADUATION_DURATION) {
            launch.phase = Phase.GRADUATED;
            launch.liquidityStage = 1;
            launch.graduationMcap = launch.startMcap * 16;
            
            emit Graduated(launch.token, poolId, block.timestamp, getCurrentMcap);
            emit PhaseChanged(poolId, Phase.GRADUATED, block.timestamp, getCurrentMcap);
        }
    }
    // Reset timer if dropped below threshold
    else {
        launch.aboveThresholdSince = 0;
    }
}
```

**Constants:**
- `GRADUATION_EPOCH = 4` (16x growth)
- `GRADUATION_DURATION = 1 hours` (3600 seconds)

### What Happens at Graduation?

**IMMEDIATELY:**
1. ✅ Hook tax disabled (returns ZERO_DELTA)
2. ✅ Pool fee switches to 1% (GRADUATED_POOL_FEE = 100 bps)
3. ✅ Transaction limits removed (maxTx = maxWallet = ∞)
4. ✅ Phase permanently set to GRADUATED (irreversible)
5. ✅ Liquidity stage initialized (for post-graduation rebalancing)

**STILL ACTIVE:**
- ✅ 70/30 fee split (via PositionManager fee collection)
- ✅ LP locked forever (no withdrawal to EOA)
- ✅ Rebalancing proposals allowed (24h timelock)

---

## 💧 LIQUIDITY REBALANCING (Post-Graduation Only)

### Overview

After graduation, liquidity can be **rebalanced** (not withdrawn) to maintain capital efficiency as MCAP grows.

### Liquidity Stages (Independent of Tax Epochs)

```solidity
function _getLiquidityStage(uint256 currentMcap, uint256 G) internal pure returns (uint8 stage) {
    // G = graduationMcap (startMcap * 16)
    
    if (currentMcap < G * 6) {
        return 1;  // Up to 96x start MCAP
    } else if (currentMcap < G * 60) {
        return 2;  // Up to 960x start MCAP
    } else {
        return 3;  // 960x+ start MCAP
    }
}
```

**Example (1 ETH start → 16 ETH graduation):**

| Current MCAP | Stage | Multiplier | Notes |
|--------------|-------|------------|-------|
| 16-96 ETH | 1 | 16-96x | Bootstrap range |
| 96-960 ETH | 2 | 96-960x | Mid growth |
| 960+ ETH | 3 | 960x+ | Mature |

### Rebalancing Process

**Executed via ClawclickLPLocker:**

1. **Proposal:** Owner calls `proposeRebalance(token, stage)`
   - Requires graduation
   - Starts 24-hour timelock
   
2. **Timelock:** Wait 24 hours
   - Anti-manipulation delay
   - Allows community review
   
3. **Execution:** Anyone calls `executeRebalance(token)`
   - Decreases old position
   - Increases new position with tighter range
   - Collects fees (distributed 70/30)
   - Still protocol-owned (no withdrawal)

### Rebalancing Actions

**Per stage, liquidity is adjusted to:**
- **Stage 1:** Full range (bootstrap)
- **Stage 2:** Tighter range around current price
- **Stage 3:** Very tight range around current price

**Goal:** Maximize capital efficiency while maintaining liquidity.

**Important:** LP NFT **NEVER leaves the LPLocker**. Funds are rebalanced within Uniswap, not withdrawn.

---

## 🔧 CONFIGURATION VS HARD-CODED

### Hard-Coded (Cannot Change After Deployment)

**In ClawclickHook_V4.sol:**
```solidity
TOTAL_SUPPLY = 1_000_000_000 * 1e18  // 1 billion tokens
TAX_FLOOR_BPS = 100                  // 1%
BASE_LIMIT_BPS = 10                  // 0.1%
GRADUATION_EPOCH = 4                 // 16x growth
GRADUATION_DURATION = 1 hours        // 3600 seconds
BENEFICIARY_SHARE_BPS = 7000         // 70%
PLATFORM_SHARE_BPS = 3000            // 30%
GRADUATED_POOL_FEE = 100             // 1%
MIN_SWAP_AMOUNT = 1e14               // 0.0001 ETH
MIN_START_MCAP = 1 ether             // 1 ETH
```

### Configured in ClawclickConfig (Set During Deployment)

**In ClawclickConfig.sol constructor:**
```solidity
taxTiers[1 ether] = 5000   // 50%
taxTiers[2 ether] = 4500   // 45%
taxTiers[3 ether] = 4000   // 40%
taxTiers[4 ether] = 3500   // 35%
taxTiers[5 ether] = 3000   // 30%
taxTiers[6 ether] = 2500   // 25%
taxTiers[7 ether] = 2000   // 20%
taxTiers[8 ether] = 1500   // 15%
taxTiers[9 ether] = 1000   // 10%
taxTiers[10 ether] = 500   // 5%
```

**🔒 SECURITY:** These are set **ONCE** in the Config constructor and **CANNOT be changed** post-deployment. This is intentional for security and user trust.

### Configurable by Owner (After Deployment)

**In ClawclickConfig.sol (admin functions):**
```solidity
treasury              // Platform treasury address (can update)
platformShareBps      // Platform share (can update, max 50%)
factory               // Factory address (can update)
paused                // Pause state (can toggle)
```

**Note:** Tax tiers are **IMMUTABLE** - owner removed `setTaxTier()` function for security.

---

## 🎯 SUMMARY

### Tax System
- ✅ Based on **doublings** (epochs)
- ✅ Decays by **halving** each epoch
- ✅ Floors at **1%**
- ✅ Starting tax determined by target MCAP (1-10 ETH)
- ✅ **IMMUTABLE** after Config deployment

### Limit System
- ✅ Starts **TIGHT** (0.1% at launch)
- ✅ **GROWS** proportionally with MCAP
- ✅ **ANTI-BOT** protection (prevents whale dumping on small MC)
- ✅ **REMOVED** at graduation

### Graduation
- ✅ Triggers at **16x growth** (epoch 4)
- ✅ Must **sustain 1 hour**
- ✅ **PERMANENT** state change
- ✅ Hook tax → **0%**, Pool fee → **1%**

### Liquidity Rebalancing
- ✅ Only **post-graduation**
- ✅ **24-hour timelock** on proposals
- ✅ **3 stages** based on MCAP growth
- ✅ **NEVER withdrawable** to EOA
- ✅ **70/30 fee split** continues

---

## ⚠️ DISCREPANCIES FOUND

### Issue 1: Dual Tax Tier Definitions

**In ClawclickConfig.sol:**
```solidity
taxTiers[1 ether] = 5000   // 50%
taxTiers[10 ether] = 500   // 5%
```

**In ClawclickHook_V4.sol (_getBaseTaxForMcap):**
```solidity
if (mcapInEth >= 10) return 500;   // 5%
return 5000;  // 50% (1 ETH)
```

**Recommendation:** Remove internal `_getBaseTaxForMcap()` and use Config tax tiers only. Currently unused in Hook.

---

## 📞 QUESTIONS TO RESOLVE

1. ✅ **Confirmed:** Tax tiers are set in Config and immutable
2. ✅ **Confirmed:** Limits grow with MCAP (anti-bot logic is correct)
3. ✅ **Confirmed:** Epoch system uses doubling (log2)
4. ✅ **Confirmed:** Rebalancing only post-graduation with timelock
5. ⚠️ **To Fix:** Remove duplicate `_getBaseTaxForMcap()` in Hook

---

_Documentation complete. Ready for audit._
