# 📜 Claw.Click Smart Contracts

**Multi-Position Progressive Liquidity System**

This document provides a detailed overview of each contract in the Claw.Click system, including their functions, interactions, and technical implementation details.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Contract Architecture                     │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ ClawclickConfig │ ← Immutable constants
└────────┬────────┘
         │ inherits
         ▼
┌─────────────────┐       ┌──────────────────┐
│ClawclickFactory │◄─────►│ ClawclickHook_V4 │
│                 │ calls │                  │
│ • createLaunch()│       │ • beforeSwap()   │
│ • mintNext...() │       │ • afterSwap()    │
│ • retireOld...()│       │ • afterInit...() │
└────────┬────────┘       └─────────┬────────┘
         │                          │
         │ creates                  │ triggers
         ▼                          │
┌─────────────────┐                │
│ ClawclickToken  │                │
│ (ERC20)         │                │
└─────────────────┘                │
                                   │
         ┌─────────────────────────┘
         │ manages
         ▼
┌──────────────────────────────────┐
│   Uniswap V4 Infrastructure      │
│ • PoolManager                    │
│ • PositionManager (ERC721 NFTs)  │
└──────────────────────────────────┘
```

---

## 📋 Contract Files

1. **[ClawclickConfig.sol](#clawclickconfigsol)** - Configuration constants
2. **[ClawclickFactory.sol](#clawclickfactorysol)** - Token launcher & position manager
3. **[ClawclickHook_V4.sol](#clawclickhook_v4sol)** - Uniswap V4 hook with tax logic
4. **[ClawclickToken.sol](#clawclicktokensol)** - Simple ERC20 token implementation

---

## 1. ClawclickConfig.sol

**Purpose:** Centralized configuration with all system constants

### Constants

#### Bootstrap Requirements
```solidity
uint256 public constant MIN_BOOTSTRAP_ETH = 0.001 ether;  // $2 minimum launch
```

#### Position System
```solidity
uint256 public constant POSITION_OVERLAP_BPS = 500;       // 5% overlap between positions
uint256 public constant POSITION_MCAP_MULTIPLIER = 16;    // 16x coverage per position (4 doublings)
uint256 public constant RETIREMENT_OFFSET = 2;             // Retire when 2 positions ahead
```

#### Token Allocations (Basis Points)
```solidity
uint256 public constant POSITION_1_ALLOCATION_BPS = 75000;  // 75.00%
uint256 public constant POSITION_2_ALLOCATION_BPS = 18750;  // 18.75%
uint256 public constant POSITION_3_ALLOCATION_BPS = 4688;   // 4.69%
uint256 public constant POSITION_4_ALLOCATION_BPS = 1172;   // 1.17%
uint256 public constant POSITION_5_ALLOCATION_BPS = 390;    // 0.39%
```
**Total:** 100,000 bps = 100%

#### Tax Tiers (Launch Phase Only)
```solidity
uint256 public constant TAX_TIER_1_BPS = 5000;  // 50% (Epoch 1)
uint256 public constant TAX_TIER_2_BPS = 2500;  // 25% (Epoch 2)
uint256 public constant TAX_TIER_3_BPS = 1250;  // 12.5% (Epoch 3)
uint256 public constant TAX_TIER_4_BPS = 625;   // 6.25% (Epoch 4)
```

#### Fee Distribution
```solidity
uint256 public constant PLATFORM_FEE_BPS = 3000;      // 30% of hook tax to platform
uint256 public constant BENEFICIARY_FEE_BPS = 7000;   // 70% to token creator
uint256 public constant GRADUATED_LP_FEE_BPS = 100;   // 1% LP fee after graduation
```

### Why These Numbers?

**Token Allocations:**
- Geometric decay matches Uniswap V2 constant product formula
- Each position: previous position ÷ 4
- Maintains consistent slippage across all price levels

**Tax Tiers:**
- Geometric decay: 50% → 25% → 12.5% → 6.25%
- Protects against early sniping
- Gradually reduces friction as token proves itself
- Completely removed after graduation

**Position Multiplier (16x):**
- Each position covers 4 doublings of market cap
- Perfect for smooth exponential growth
- P1: 2k→32k, P2: 32k→512k, P3: 512k→8M, etc.

---

## 2. ClawclickFactory.sol

**Purpose:** Main contract for launching tokens and managing the 5-position lifecycle

### State Variables

#### Core Structures
```solidity
struct PoolState {
    address token;                  // Token contract address
    address beneficiary;            // Creator address (receives fees)
    uint256 startingMCAP;          // Initial market cap in ETH
    uint256 graduationMCAP;        // Market cap at graduation (16x starting)
    uint256 totalSupply;           // Total token supply
    uint256[5] positionTokenIds;   // NFT token IDs for all 5 positions
    bool[5] positionMinted;        // Track which positions exist
    bool[5] positionRetired;       // Track which positions are retired
    uint256 recycledETH;           // ETH recovered from retired positions
    bool activated;                // Pool is active
    bool graduated;                // Passed 16x MCAP threshold
}

mapping(PoolId => PoolState) public poolStates;
```

#### External References
```solidity
IPoolManager public immutable poolManager;
IPositionManager public immutable positionManager;
ClawclickHook_V4 public hook;
address public platformFeeRecipient;
```

### Core Functions

#### 1. createLaunch()
**Purpose:** Launch a new token with Position 1

```solidity
function createLaunch(
    address token,
    uint256 totalSupply,
    uint256 startingMCAP,
    address beneficiary,
    bytes calldata metadata
) external payable nonReentrant returns (PoolId poolId)
```

**Process:**
1. Validates bootstrap ETH (≥ 0.001)
2. Calculates all 5 position ranges
3. Mints Position 1 only with bootstrap ETH
4. Initializes pool with starting price
5. Stores PoolState with position tracking
6. Returns PoolId for reference

**Emits:** `LaunchCreated(poolId, token, beneficiary, startingMCAP)`

#### 2. _calculatePositionRanges()
**Purpose:** Pre-calculate all 5 position tick ranges at launch

```solidity
function _calculatePositionRanges(
    uint256 startingMCAP,
    uint256 totalSupply
) internal view returns (
    int24[5] memory tickLowers,
    int24[5] memory tickUppers,
    uint256[5] memory tokenAllocations
)
```

**Math:**
```
For each position N (0-4):
  MCAP_start = startingMCAP × (16 ^ N)
  MCAP_end = MCAP_start × 16
  
  With 5% overlap:
    tickLower_N = priceToTick(MCAP_start × 0.95)
    tickUpper_N = priceToTick(MCAP_end × 1.05)
  
  Token allocation:
    position[0] = 75000 bps (75.00%)
    position[1] = 18750 bps (18.75%)
    position[2] = 4688 bps (4.69%)
    position[3] = 1172 bps (1.17%)
    position[4] = 390 bps (0.39%)
```

**Returns:**
- Tick ranges for all 5 positions
- Token amounts for each position
- All aligned to tick spacing (60 for dynamic fee)

#### 3. mintNextPosition()
**Purpose:** Create next position when current position reaches epoch 2

```solidity
function mintNextPosition(
    PoolId poolId,
    uint256 positionIndex
) external nonReentrant
```

**Access:** Only callable by Hook

**Process:**
1. Validates position not already minted
2. Retrieves pre-calculated tick range
3. Adds recycled ETH from retired positions
4. Mints concentrated liquidity position
5. Stores NFT token ID
6. Sets positionMinted[index] = true

**Example:**
```
P1 Epoch 2 reached (4k MCAP):
  → Hook calls mintNextPosition(poolId, 1)
  → P2 created with 18.75% tokens
  → Uses bootstrap ETH + any recycled ETH
  → NFT stored in positionTokenIds[1]
```

**Emits:** `PositionMinted(poolId, positionIndex, nftTokenId)`

#### 4. retireOldPosition()
**Purpose:** Remove old position and recycle capital when 2 positions ahead

```solidity
function retireOldPosition(
    PoolId poolId,
    uint256 positionIndex
) external nonReentrant
```

**Access:** Only callable by Hook

**Process:**
1. Validates position exists and not already retired
2. Calls `decreaseLiquidity()` to remove 100%
3. Calls `collect()` to retrieve ETH + tokens
4. Stores recovered ETH in poolState.recycledETH
5. Burns the NFT position
6. Sets positionRetired[index] = true

**Example:**
```
P3 Epoch 1 reached (128k MCAP):
  → Hook calls retireOldPosition(poolId, 0)
  → P1 liquidity withdrawn
  → Recovered ETH stored for P4/P5
  → P1 NFT burned
```

**Capital Recycling:**
```
Retirement Schedule:
  P1 retires → funds P4 minting
  P2 retires → funds P5 minting
  P3 retires → future use / claimable
  P4, P5 → remain forever
```

**Emits:** `PositionRetired(poolId, positionIndex, ethRecovered)`

#### 5. collectFeesFromPosition()
**Purpose:** Collect accumulated LP fees from a position

```solidity
function collectFeesFromPosition(
    PoolId poolId,
    uint256 positionIndex
) external nonReentrant
```

**Access:** Only owner

**Process:**
1. Retrieves position NFT token ID
2. Calls `collect()` with amount = 0 (fees only)
3. Transfers ETH + tokens to beneficiary

**Emits:** `FeesCollected(poolId, positionIndex, ethAmount, tokenAmount)`

### Access Control

```solidity
modifier onlyHook() {
    require(msg.sender == address(hook), "Only hook");
    _;
}

modifier onlyOwner() {
    require(msg.sender == owner, "Only owner");
    _;
}
```

### Security Features

✅ **Reentrancy Protection** - All external calls use `nonReentrant`  
✅ **State Validation** - Checks before minting/retiring  
✅ **Access Control** - Only Hook can manage positions  
✅ **Capital Safety** - All ETH tracked in recycledETH  

---

## 3. ClawclickHook_V4.sol

**Purpose:** Uniswap V4 hook implementing tax logic, epoch tracking, and position management

### Implements Interfaces

```solidity
contract ClawclickHook_V4 is BaseHook, Owned, ReentrancyGuard
```

**Hook Permissions:**
- `beforeInitialize` - Set graduated LP fee
- `beforeSwap` - Enforce P1 limits and tax
- `afterSwap` - Track epochs, trigger position changes

### State Variables

#### Progress Tracking
```solidity
struct PoolProgress {
    uint256 currentPosition;     // 1-5 (which position is active)
    uint256 currentEpoch;        // 1-4 within position
    uint256 lastMCAP;           // Last recorded market cap
}

mapping(PoolId => PoolProgress) public poolProgress;
```

#### Fee Accounting (Separated by Currency)
```solidity
// ETH fees (from buys)
mapping(address => uint256) public beneficiaryFeesETH;
uint256 public platformFeesETH;

// Token fees (from sells)
mapping(address => mapping(address => uint256)) public beneficiaryFeesToken;
mapping(address => uint256) public platformFeesToken;
```

#### Launch Registry
```solidity
struct LaunchInfo {
    address token;
    address beneficiary;
    uint256 startingMCAP;
    uint256 graduationMCAP;
    bool exists;
}

mapping(PoolId => LaunchInfo) public launches;
```

### Hook Functions

#### 1. afterInitialize()
**Purpose:** Register new launch and set graduated LP fee

```solidity
function afterInitialize(
    address,
    PoolKey calldata key,
    uint160,
    int24,
    bytes calldata hookData
) external override returns (bytes4)
```

**Process:**
1. Decode hookData for launch parameters
2. Store LaunchInfo
3. Set lpFee to GRADUATED_LP_FEE_BPS (but disabled until graduation)
4. Initialize PoolProgress (position=1, epoch=1)

**Returns:** `BaseHook.afterInitialize.selector`

#### 2. beforeSwap()
**Purpose:** Enforce Position 1 limits and take hook tax

```solidity
function beforeSwap(
    address,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    bytes calldata
) external override returns (bytes4, BeforeSwapDelta, uint24)
```

**Process:**

**A. Check Graduation Status**
```solidity
if (poolState.graduated) {
    return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
}
```

**B. Enforce Position 1 Only (Pre-Graduation)**
```solidity
require(progress.currentPosition == 1, "Only P1 trades allowed");
```

**C. Calculate Tax (Buys Only)**
```solidity
uint256 taxRate = _getCurrentTaxRate(progress.currentEpoch);

if (params.zeroForOne) {  // ETH → Token (buy)
    uint256 feeAmount = (inputAmount * taxRate) / 10000;
    
    // Distribute: 70% beneficiary, 30% platform
    beneficiaryFeesETH[launch.beneficiary] += feeAmount * 7000 / 10000;
    platformFeesETH += feeAmount * 3000 / 10000;
    
    // Return delta to extract fee from swap
    delta = toBeforeSwapDelta(int128(uint128(feeAmount)), 0);
}
```

**Returns:**
- Selector
- BeforeSwapDelta (fee amount to extract)
- Override fee (0, using hook tax instead)

#### 3. afterSwap()
**Purpose:** Track epochs, trigger graduation, manage positions

```solidity
function afterSwap(
    address,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata,
    BalanceDelta,
    bytes calldata
) external override returns (bytes4, int128)
```

**Process Flow:**

**A. Get Current Market Cap**
```solidity
(uint160 sqrtPriceX96,,) = poolManager.getSlot0(poolId);
uint256 currentMCAP = _sqrtPriceToMCAP(sqrtPriceX96, launch.token);
```

**B. Check for Graduation (BEFORE Epoch Advancement)**
```solidity
if (!poolState.graduated && 
    progress.currentPosition == 1 && 
    currentMCAP >= launch.graduationMCAP) {
    
    _graduatePool(poolId);
    // Transition to P2 automatically
}
```

**C. Detect Epoch Changes**
```solidity
// Epoch advances when MCAP doubles
if (currentMCAP >= progress.lastMCAP * 2) {
    progress.currentEpoch++;
    progress.lastMCAP = currentMCAP;
    
    // Trigger position minting at epoch 2
    if (progress.currentEpoch == 2) {
        _mintNextPositionIfNeeded(poolId);
    }
    
    emit EpochAdvanced(poolId, progress.currentPosition, progress.currentEpoch);
}
```

**D. Detect Position Changes**
```solidity
// Position advances after 4 epochs (16x MCAP growth)
if (progress.currentEpoch > 4) {
    progress.currentPosition++;
    progress.currentEpoch = 1;
    
    // Retire old positions (2 steps behind)
    _retireOldPositionIfNeeded(poolId);
    
    emit PositionAdvanced(poolId, progress.currentPosition);
}
```

**Returns:**
- Selector
- 0 (no additional delta)

### Internal Helper Functions

#### _getCurrentTaxRate()
```solidity
function _getCurrentTaxRate(uint256 epoch) internal view returns (uint256) {
    if (epoch == 1) return TAX_TIER_1_BPS;      // 50%
    if (epoch == 2) return TAX_TIER_2_BPS;      // 25%
    if (epoch == 3) return TAX_TIER_3_BPS;      // 12.5%
    if (epoch == 4) return TAX_TIER_4_BPS;      // 6.25%
    return 0;
}
```

#### _graduatePool()
```solidity
function _graduatePool(PoolId poolId) internal {
    PoolState storage state = factory.poolStates(poolId);
    state.graduated = true;
    
    // Hook tax disabled, LP fee (1%) now active
    emit PoolGraduated(poolId, block.timestamp);
}
```

#### _mintNextPositionIfNeeded()
```solidity
function _mintNextPositionIfNeeded(PoolId poolId) internal {
    uint256 nextIndex = progress.currentPosition;  // 0-indexed
    
    if (nextIndex < 4 && !poolState.positionMinted[nextIndex]) {
        try factory.mintNextPosition(poolId, nextIndex) {
            emit PositionMintTriggered(poolId, nextIndex);
        } catch {
            emit PositionMintFailed(poolId, nextIndex);
        }
    }
}
```

#### _retireOldPositionIfNeeded()
```solidity
function _retireOldPositionIfNeeded(PoolId poolId) internal {
    if (progress.currentPosition > RETIREMENT_OFFSET) {
        uint256 retireIndex = progress.currentPosition - RETIREMENT_OFFSET - 1;
        
        if (poolState.positionMinted[retireIndex] && 
            !poolState.positionRetired[retireIndex]) {
            
            try factory.retireOldPosition(poolId, retireIndex) {
                emit PositionRetireTriggered(poolId, retireIndex);
            } catch {
                emit PositionRetireFailed(poolId, retireIndex);
            }
        }
    }
}
```

### Fee Withdrawal

#### claimBeneficiaryFees()
```solidity
function claimBeneficiaryFees(address token) external nonReentrant {
    uint256 ethFees = beneficiaryFeesETH[msg.sender];
    uint256 tokenFees = beneficiaryFeesToken[msg.sender][token];
    
    if (ethFees > 0) {
        beneficiaryFeesETH[msg.sender] = 0;
        payable(msg.sender).transfer(ethFees);
    }
    
    if (tokenFees > 0) {
        beneficiaryFeesToken[msg.sender][token] = 0;
        IERC20(token).transfer(msg.sender, tokenFees);
    }
}
```

#### claimPlatformFees()
```solidity
function claimPlatformFees(address token) external onlyOwner nonReentrant {
    uint256 ethFees = platformFeesETH;
    uint256 tokenFees = platformFeesToken[token];
    
    if (ethFees > 0) {
        platformFeesETH = 0;
        payable(owner).transfer(ethFees);
    }
    
    if (tokenFees > 0) {
        platformFeesToken[token] = 0;
        IERC20(token).transfer(owner, tokenFees);
    }
}
```

### Security Features

✅ **Reentrancy Protection** - All state-changing functions guarded  
✅ **Try/Catch on Factory Calls** - Position management failures won't brick swaps  
✅ **Graduation Timing Fix** - Checked BEFORE epoch advancement  
✅ **Fee Separation** - ETH and token fees tracked separately  
✅ **Access Control** - Only owner can claim platform fees  

---

## 4. ClawclickToken.sol

**Purpose:** Simple ERC20 token for launched tokens

```solidity
contract ClawclickToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply);
    }
}
```

**Features:**
- Standard ERC20 implementation
- Mints entire supply to creator at deployment
- No special permissions or restrictions
- Can be replaced with any ERC20-compatible token

---

## 🔄 Complete Lifecycle Flow

### Example: Launch with 2k Starting MCAP

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: LAUNCH                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ User calls: factory.createLaunch()                          │
│   ├─ Validates 0.001 ETH bootstrap                          │
│   ├─ Calculates 5 position ranges                           │
│   ├─ Mints P1 (75% tokens, 2k→32k range)                   │
│   ├─ Initializes pool                                       │
│   └─ Returns poolId                                         │
│                                                              │
│ Hook.afterInitialize() registers launch                     │
│   ├─ Stores LaunchInfo                                      │
│   ├─ Sets LP fee (disabled until graduation)               │
│   └─ Initializes PoolProgress (position=1, epoch=1)        │
│                                                              │
│ Result: Pool live, ready for trading                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: P1 EPOCH 1 (2k→4k MCAP)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Swaps happen:                                               │
│   beforeSwap() → 50% hook tax on buys                      │
│   afterSwap() → tracks MCAP                                │
│                                                              │
│ At 4k MCAP (doubling):                                      │
│   afterSwap() detects: currentMCAP >= lastMCAP * 2        │
│   ├─ currentEpoch++ (now = 2)                              │
│   ├─ lastMCAP = 4k                                          │
│   └─ emit EpochAdvanced                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: P1 EPOCH 2 (4k→8k MCAP)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Epoch 2 start triggers:                                     │
│   _mintNextPositionIfNeeded()                               │
│   └─ factory.mintNextPosition(poolId, 1)  [P2]             │
│       ├─ Uses pre-calculated range (32k→512k)              │
│       ├─ Allocates 18.75% tokens                           │
│       ├─ Adds bootstrap ETH                                │
│       └─ Stores NFT ID                                      │
│                                                              │
│ Swaps continue:                                             │
│   beforeSwap() → 25% hook tax                              │
│                                                              │
│ At 8k MCAP:                                                 │
│   afterSwap() → currentEpoch++ (now = 3)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: P1 EPOCH 3 (8k→16k MCAP)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Epoch 3 start triggers:                                     │
│   factory.mintNextPosition(poolId, 2)  [P3]                │
│   └─ Range: 512k→8M MCAP                                   │
│                                                              │
│ Swaps: 12.5% hook tax                                       │
│                                                              │
│ At 16k MCAP:                                                │
│   afterSwap() → currentEpoch++ (now = 4)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: P1 EPOCH 4 (16k→32k MCAP)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Swaps: 6.25% hook tax                                       │
│                                                              │
│ At 32k MCAP (graduation threshold):                         │
│   afterSwap() checks BEFORE epoch advancement:             │
│   ├─ currentMCAP >= graduationMCAP (32k)                   │
│   ├─ _graduatePool()                                       │
│   │   ├─ graduated = true                                  │
│   │   ├─ Hook tax DISABLED                                 │
│   │   └─ LP fee (1%) ENABLED                               │
│   ├─ currentPosition++ (now = 2)                           │
│   ├─ currentEpoch = 1                                       │
│   └─ emit PoolGraduated                                     │
│                                                              │
│ Result: Smooth transition to P2                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: P2 EPOCH 1 (32k→64k MCAP)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Position 2 now active:                                      │
│   beforeSwap() → No hook tax (graduated)                   │
│   1% LP fee applies                                         │
│                                                              │
│ Position retirement triggered:                              │
│   currentPosition (2) > RETIREMENT_OFFSET (2)?             │
│   └─ No, need position 3 first                             │
│                                                              │
│ At 64k MCAP:                                                │
│   afterSwap() → P2 epoch++ (now = 2)                       │
│   └─ factory.mintNextPosition(poolId, 3)  [P4]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 7: P3 EPOCH 1 (128k MCAP)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Position retirement triggered:                              │
│   currentPosition (3) > RETIREMENT_OFFSET (2)              │
│   └─ Yes! Retire position: 3 - 2 - 1 = 0 (P1)             │
│                                                              │
│ factory.retireOldPosition(poolId, 0)                        │
│   ├─ Withdraw all P1 liquidity                             │
│   ├─ Collect ETH + remaining tokens                        │
│   ├─ Store ETH in recycledETH                              │
│   ├─ Burn P1 NFT                                            │
│   └─ emit PositionRetired                                   │
│                                                              │
│ At 256k MCAP:                                               │
│   afterSwap() → P3 epoch++ (now = 2)                       │
│   └─ factory.mintNextPosition(poolId, 4)  [P5]             │
│       └─ Uses recycled ETH from P1!                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 8: FINAL STATE (128M+ MCAP)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Position 5 active (64M→∞ range)                            │
│ Position 4 active as support                                │
│ Positions 1, 2, 3 all retired                              │
│ All capital recycled                                        │
│ Pure AMM with 1% LP fee                                     │
│                                                              │
│ System complete! 🎉                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Running Tests

```bash
cd contracts
forge test -vv
```

### Test Coverage

- ✅ Position range calculations
- ✅ Lazy minting triggers
- ✅ Capital recycling
- ✅ Epoch tracking
- ✅ Graduation timing
- ✅ Tax tier calculations
- ✅ Fee distribution
- ✅ Access control
- ✅ Reentrancy protection

### Gas Benchmarks

See [`GAS_REPORT.md`](GAS_REPORT.md) for detailed gas analysis.

---

## 🔒 Security

### Access Controls

| Function | Caller | Protected By |
|----------|--------|--------------|
| `createLaunch()` | Anyone | ETH requirement |
| `mintNextPosition()` | Hook only | `onlyHook` modifier |
| `retireOldPosition()` | Hook only | `onlyHook` modifier |
| `collectFeesFromPosition()` | Owner only | `onlyOwner` modifier |
| `claimPlatformFees()` | Owner only | `onlyOwner` modifier |
| `claimBeneficiaryFees()` | Beneficiary | Address check |

### State Guards

```solidity
// Prevent double-minting
require(!poolState.positionMinted[index], "Already minted");

// Prevent double-retirement
require(!poolState.positionRetired[index], "Already retired");

// Prevent retiring unminted positions
require(poolState.positionMinted[index], "Not minted");
```

### Reentrancy Protection

All external calls use OpenZeppelin's `ReentrancyGuard`:
```solidity
modifier nonReentrant() {
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
    _status = _ENTERED;
    _;
    _status = _NOT_ENTERED;
}
```

---

## 📚 Additional Resources

- **[Main README](../README.md)** - Project overview
- **[SKILL.md](../SKILL.md)** - OpenClaw agent integration
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to testnet/mainnet
- **[FAQ](../docs/FAQ.md)** - Common questions

---

## 🤝 Contributing

Found a bug? Have an improvement? Please see our [Contributing Guide](../CONTRIBUTING.md).

---

<div align="center">

**📜 Smart contracts for the next generation of token launches 📜**

[Back to Main README](../README.md) • [View Tests](test/) • [Report Issue](https://github.com/clawclick/claw-click/issues)

</div>
