# 🔧 Claw Click v4 - Core Contracts Refactor Plan

**Date:** 2026-02-18  
**Status:** Ready for Implementation  
**Contracts Location:** `C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\contracts\src\core\`

---

## 📋 Overview

**Goal:** Transform single-position + rebalancing system into 5-position progressive liquidity architecture.

**Key Changes:**
1. Remove all rebalancing logic
2. Add multi-position tracking and management
3. Implement lazy minting (positions created as needed)
4. Add position retirement and ETH recycling
5. Simplify graduation to flag switch only

---

## 🔧 Contract-by-Contract Refactor

### **1. ClawclickFactory.sol**

**File:** `contracts/src/core/ClawclickFactory.sol`

#### **REMOVE (Lines to Delete):**

```solidity
// ❌ Remove rebalancing logic
function rebalanceLiquidity(...) external { ... }
bool private _rebalancing;
uint256 public lastRebalancePrice;
int24 public targetTickLower;
int24 public targetTickUpper;

// ❌ Remove single position approach
function _mintInitialPosition(...) internal { ... }  // Replace with _mintPosition

// ❌ Remove dynamic tick calculation
function _calculateDynamicTicks(...) internal { ... }
```

#### **ADD (New Functions):**

```solidity
// ✅ Calculate all 5 position ranges with 5% overlap
function _calculatePositionRanges(
    uint256 startingMCAP,
    uint256 totalSupply,
    address token
) internal view returns (
    int24[5] memory tickLowers,
    int24[5] memory tickUppers,
    uint256[5] memory tokenAllocations
) {
    // Position allocations (geometric decay)
    tokenAllocations[0] = totalSupply * 75000 / 100000;   // 75.0000%
    tokenAllocations[1] = totalSupply * 18750 / 100000;   // 18.7500%
    tokenAllocations[2] = totalSupply * 4688 / 100000;    // 4.6875%
    tokenAllocations[3] = totalSupply * 1172 / 100000;    // 1.1719%
    tokenAllocations[4] = totalSupply * 390 / 100000;     // 0.3906%
    
    // Calculate tick ranges for each position
    // P1: startMCAP → 16x with 5% extension
    // P2: 16x (5% early) → 256x with 5% extension
    // P3: 256x (5% early) → 4,096x with 5% extension
    // P4: 4,096x (5% early) → 65,536x with 5% extension
    // P5: 65,536x (5% early) → max tick
    
    uint256[5] memory mcapMilestones = [
        startingMCAP * 16,      // P1 end
        startingMCAP * 256,     // P2 end
        startingMCAP * 4096,    // P3 end
        startingMCAP * 65536,   // P4 end
        type(uint256).max       // P5 end (infinity)
    ];
    
    for (uint256 i = 0; i < 5; i++) {
        if (i == 0) {
            // P1: starts at initial MCAP
            tickLowers[i] = _mcapToTick(startingMCAP, totalSupply);
        } else {
            // P2-P5: start 5% before previous end
            tickLowers[i] = _mcapToTick(mcapMilestones[i-1] * 95 / 100, totalSupply);
        }
        
        if (i == 4) {
            // P5: ends at max tick
            tickUppers[i] = TickMath.MAX_TICK;
        } else {
            // P1-P4: end 5% after milestone
            tickUppers[i] = _mcapToTick(mcapMilestones[i] * 105 / 100, totalSupply);
        }
        
        // Ensure tick spacing alignment
        tickLowers[i] = _alignToSpacing(tickLowers[i]);
        tickUppers[i] = _alignToSpacing(tickUppers[i]);
    }
    
    return (tickLowers, tickUppers, tokenAllocations);
}

// ✅ MCAP to tick conversion helper
function _mcapToTick(
    uint256 mcap,
    uint256 totalSupply
) internal pure returns (int24) {
    // MCAP = price × totalSupply
    // price = MCAP / totalSupply (in ETH per token)
    
    // Convert to sqrtPriceX96
    uint256 priceX96 = (mcap * FixedPoint96.Q96) / totalSupply;
    uint160 sqrtPriceX96 = uint160(Math.sqrt(priceX96));
    
    // Convert to tick
    int24 tick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
    
    return tick;
}

// ✅ Align tick to spacing
function _alignToSpacing(int24 tick) internal view returns (int24) {
    int24 spacing = poolManager.tickSpacing(poolKey);
    return (tick / spacing) * spacing;
}

// ✅ Mint a specific position (called at launch and lazily)
function mintNextPosition(
    PoolId poolId,
    uint256 positionIndex  // 0-4
) external {
    require(msg.sender == address(hook), "Only hook");
    PoolState storage state = poolStates[poolId];
    require(!state.positionMinted[positionIndex], "Already minted");
    
    // Get pre-calculated ranges
    (int24[5] memory tickLowers, int24[5] memory tickUppers, uint256[5] memory allocations) = 
        _calculatePositionRanges(state.startingMCAP, state.totalSupply, state.token);
    
    // Add recycled ETH if available
    uint256 ethToAdd = state.recycledETH;
    state.recycledETH = 0;
    
    // Mint position via V4 PositionManager
    uint256 tokenId = _mintPosition(
        poolId,
        tickLowers[positionIndex],
        tickUppers[positionIndex],
        allocations[positionIndex],
        ethToAdd
    );
    
    // Store NFT token ID
    state.positionTokenIds[positionIndex] = tokenId;
    state.positionMinted[positionIndex] = true;
    
    emit PositionMinted(poolId, positionIndex, tokenId, allocations[positionIndex]);
}

// ✅ Retire old position and recycle ETH
function retireOldPosition(
    PoolId poolId,
    uint256 positionIndex  // 0-4
) external {
    require(msg.sender == address(hook), "Only hook");
    PoolState storage state = poolStates[poolId];
    require(state.positionMinted[positionIndex], "Not minted");
    
    uint256 tokenId = state.positionTokenIds[positionIndex];
    
    // Withdraw liquidity from position
    (uint256 ethRecovered, uint256 tokensRecovered) = _withdrawPosition(tokenId);
    
    // Store recycled ETH for next position
    state.recycledETH += ethRecovered;
    
    // Mark as retired
    state.positionRetired[positionIndex] = true;
    
    emit PositionRetired(poolId, positionIndex, tokenId, ethRecovered, tokensRecovered);
}

// ✅ Internal: Withdraw position via V4 PositionManager
function _withdrawPosition(
    uint256 tokenId
) internal returns (uint256 ethAmount, uint256 tokenAmount) {
    // Call V4 PositionManager to decrease liquidity to 0
    // Collect tokens + ETH
    // Burn NFT
    
    // Implementation depends on V4 PositionManager interface
    // Pseudo-code:
    // positionManager.decreaseLiquidity(tokenId, liquidity: MAX);
    // (ethAmount, tokenAmount) = positionManager.collect(tokenId);
    // positionManager.burn(tokenId);
    
    return (ethAmount, tokenAmount);
}

// ✅ Internal: Mint position via V4 PositionManager
function _mintPosition(
    PoolId poolId,
    int24 tickLower,
    int24 tickUpper,
    uint256 tokenAmount,
    uint256 ethAmount
) internal returns (uint256 tokenId) {
    // Approve tokens to PositionManager
    // Call mint with calculated params
    
    // Implementation depends on V4 PositionManager interface
    // Pseudo-code:
    // token.approve(address(positionManager), tokenAmount);
    // tokenId = positionManager.mint(
    //     poolKey,
    //     tickLower,
    //     tickUpper,
    //     tokenAmount,
    //     ethAmount
    // );
    
    return tokenId;
}
```

#### **MODIFY (Update Existing):**

```solidity
// Update struct
struct PoolState {
    address token;
    address beneficiary;
    address agentWallet;
    uint256 startingMCAP;        // Initial MCAP at launch
    uint256 graduationMCAP;      // 16x starting MCAP
    uint256 totalSupply;         // Token total supply
    uint256[5] positionTokenIds; // NFT token IDs for all positions
    bool[5] positionMinted;      // Track which positions exist
    bool[5] positionRetired;     // Track which positions are withdrawn
    uint256 recycledETH;         // ETH from withdrawn positions
    bool activated;              // Pool has been activated
    bool graduated;              // Reached 16x MCAP
    uint256 launchFee;           // Fee paid at launch
    // REMOVED: lastRebalancePrice, targetTickLower, targetTickUpper
}

// Update createPool (formerly createLaunch)
function createPool(
    string memory name,
    string memory symbol,
    address beneficiary,
    address agentWallet,
    uint256 startingMCAP  // e.g., 2000 for 2k MCAP
) external payable returns (address token, PoolId poolId) {
    require(msg.value >= 0.001 ether, "Need $2 bootstrap");
    
    // Deploy token
    token = address(new ClawclickToken(name, symbol));
    uint256 totalSupply = ClawclickToken(token).totalSupply();
    
    // Initialize pool at starting MCAP price
    PoolKey memory key = PoolKey({
        currency0: Currency.wrap(address(0)),  // ETH
        currency1: Currency.wrap(token),
        fee: 0x800000,  // Dynamic fee flag
        tickSpacing: 60,
        hooks: IHooks(address(hook))
    });
    
    uint160 sqrtPriceX96 = _calculateInitialPrice(startingMCAP, totalSupply);
    poolManager.initialize(key, sqrtPriceX96);
    poolId = key.toId();
    
    // Mint P1 only (lazy mint others later)
    (int24[5] memory tickLowers, int24[5] memory tickUppers, uint256[5] memory allocations) = 
        _calculatePositionRanges(startingMCAP, totalSupply, token);
    
    uint256 p1TokenId = _mintPosition(
        poolId,
        tickLowers[0],
        tickUppers[0],
        allocations[0],
        msg.value  // $2 bootstrap
    );
    
    // Store state
    poolStates[poolId] = PoolState({
        token: token,
        beneficiary: beneficiary,
        agentWallet: agentWallet,
        startingMCAP: startingMCAP,
        graduationMCAP: startingMCAP * 16,
        totalSupply: totalSupply,
        positionTokenIds: [p1TokenId, 0, 0, 0, 0],
        positionMinted: [true, false, false, false, false],
        positionRetired: [false, false, false, false, false],
        recycledETH: 0,
        activated: true,  // Activated immediately with bootstrap
        graduated: false,
        launchFee: msg.value
    });
    
    // Register with hook
    hook.registerLaunch(poolId, startingMCAP);
    
    emit PoolCreated(poolId, token, startingMCAP, p1TokenId);
}
```

#### **NEW EVENTS:**

```solidity
event PositionMinted(PoolId indexed poolId, uint256 indexed positionIndex, uint256 tokenId, uint256 tokenAmount);
event PositionRetired(PoolId indexed poolId, uint256 indexed positionIndex, uint256 tokenId, uint256 ethRecovered, uint256 tokensRecovered);
event PoolCreated(PoolId indexed poolId, address indexed token, uint256 startingMCAP, uint256 p1TokenId);
```

---

### **2. ClawclickHook_V4.sol**

**File:** `contracts/src/core/ClawclickHook_V4.sol`

#### **REMOVE (Lines to Delete):**

```solidity
// ❌ Remove rebalancing triggers
function _triggerRebalance(...) internal { ... }
bool private _rebalancing;

// ❌ Remove position modification logic
function _adjustPositionRange(...) internal { ... }

// ❌ Remove dynamic tick calculations during epochs
function _calculateNextTicks(...) internal { ... }
```

#### **ADD (New State Variables):**

```solidity
// Track position and epoch per pool
struct PoolProgress {
    uint256 currentPosition;      // 1-5
    uint256 currentEpoch;          // 1-4 within position
    uint256 lastEpochMCAP;         // MCAP at last epoch boundary
    bool graduated;                // End of P1 epoch 4
}

mapping(PoolId => PoolProgress) public poolProgress;
```

#### **MODIFY (Update Existing):**

```solidity
// Update registerLaunch
function registerLaunch(
    PoolId poolId,
    uint256 startingMCAP
) external {
    require(msg.sender == address(factory), "Only factory");
    
    launchParams[poolId] = LaunchParams({
        startingMCAP: startingMCAP,
        graduationMCAP: startingMCAP * 16,
        baseTax: 5000,  // 50%
        registered: true
    });
    
    poolProgress[poolId] = PoolProgress({
        currentPosition: 1,
        currentEpoch: 1,
        lastEpochMCAP: startingMCAP,
        graduated: false
    });
}

// Simplify beforeSwap - only enforce rules in P1
function beforeSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    bytes calldata hookData
) external override returns (bytes4, BeforeSwapDelta, uint24) {
    PoolId poolId = key.toId();
    PoolProgress storage progress = poolProgress[poolId];
    
    // Only enforce hook tax + limits in P1 (pre-graduation)
    if (progress.currentPosition == 1 && !progress.graduated) {
        // Calculate tax based on current epoch
        uint256 tax = _calculateHookTax(poolId);
        
        // Enforce max wallet
        _enforceMaxWallet(poolId, sender, params);
        
        // Enforce max tx
        _enforceMaxTx(poolId, params);
        
        // Set pending tax
        pendingTax[poolId] = tax;
    }
    
    // P2+ has no hook interference, LP fee handles everything
    return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
}

// Update afterSwap - track epochs and trigger position actions
function afterSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external override returns (bytes4, int128) {
    PoolId poolId = key.toId();
    PoolProgress storage progress = poolProgress[poolId];
    LaunchParams storage launch = launchParams[poolId];
    
    // Calculate current MCAP
    uint256 currentMCAP = _calculateMCAP(poolId);
    
    // Check for epoch advancement (MCAP doubled from last epoch)
    if (currentMCAP >= progress.lastEpochMCAP * 2) {
        progress.currentEpoch++;
        progress.lastEpochMCAP = currentMCAP;
        
        emit EpochAdvanced(poolId, progress.currentPosition, progress.currentEpoch, currentMCAP);
        
        // EPOCH 2: Lazy mint next position
        if (progress.currentEpoch == 2 && progress.currentPosition < 5) {
            try factory.mintNextPosition(poolId, progress.currentPosition) {
                // Position minted successfully
            } catch {
                // Already minted or error - continue
            }
        }
        
        // EPOCH 4 → EPOCH 1: Move to next position
        if (progress.currentEpoch > 4) {
            progress.currentPosition++;
            progress.currentEpoch = 1;
            
            emit PositionTransition(poolId, progress.currentPosition);
            
            // POSITION 3+: Retire old position (2 steps back)
            if (progress.currentPosition >= 3) {
                uint256 posToRetire = progress.currentPosition - 2;
                try factory.retireOldPosition(poolId, posToRetire) {
                    // Position retired successfully
                } catch {
                    // Already retired or error - continue
                }
            }
        }
    }
    
    // Check for graduation (end of P1 epoch 4)
    if (progress.currentPosition == 1 && 
        progress.currentEpoch == 4 && 
        currentMCAP >= launch.graduationMCAP &&
        !progress.graduated) {
        
        progress.graduated = true;
        emit Graduation(poolId, currentMCAP, block.timestamp);
    }
    
    // Apply hook tax if in P1 (only if tax was set in beforeSwap)
    if (progress.currentPosition == 1 && !progress.graduated) {
        uint256 tax = pendingTax[poolId];
        if (tax > 0) {
            _collectHookTax(poolId, sender, tax, delta);
            delete pendingTax[poolId];
        }
    }
    
    return (BaseHook.afterSwap.selector, 0);
}

// Simplify tax calculation - based on epoch only
function _calculateHookTax(PoolId poolId) internal view returns (uint256) {
    PoolProgress storage progress = poolProgress[poolId];
    LaunchParams storage launch = launchParams[poolId];
    
    uint256 baseTax = launch.baseTax;  // 5000 = 50%
    
    // Tax halves each epoch: 50% → 25% → 12.5% → 6.25%
    if (progress.currentEpoch == 4) return baseTax / 8;      // 6.25%
    if (progress.currentEpoch == 3) return baseTax / 4;      // 12.5%
    if (progress.currentEpoch == 2) return baseTax / 2;      // 25%
    return baseTax;                                           // 50%
}
```

#### **NEW EVENTS:**

```solidity
event EpochAdvanced(PoolId indexed poolId, uint256 position, uint256 newEpoch, uint256 currentMCAP);
event PositionTransition(PoolId indexed poolId, uint256 newPosition);
event Graduation(PoolId indexed poolId, uint256 finalMCAP, uint256 timestamp);
```

---

### **3. ClawclickConfig.sol**

**File:** `contracts/src/core/ClawclickConfig.sol`

#### **ADD:**

```solidity
// Position overlap percentage (5%)
uint256 public constant POSITION_OVERLAP_BPS = 500;  // 5%

// Token allocations (basis points)
uint256[5] public POSITION_ALLOCATIONS = [
    75000,   // P1: 75.0000%
    18750,   // P2: 18.7500%
    4688,    // P3: 4.6875%
    1172,    // P4: 1.1719%
    390      // P5: 0.3906%
];

// Bootstrap requirement
uint256 public constant MIN_BOOTSTRAP_ETH = 0.001 ether;  // $2

// Position retirement threshold (retire when X positions ahead)
uint256 public constant RETIREMENT_OFFSET = 2;
```

---

### **4. ClawclickToken.sol**

**File:** `contracts/src/core/ClawclickToken.sol`

#### **NO CHANGES NEEDED** ✅

Token remains a simple ERC20 with no mint/burn/admin functions.

---

## 📝 Implementation Steps

### **Phase 1: Preparation**
1. ✅ Read all current contract code
2. ✅ Document all functions to be removed
3. ✅ Create new function signatures
4. ✅ Update storage structures

### **Phase 2: Factory Refactor**
1. [ ] Remove rebalancing functions
2. [ ] Add `_calculatePositionRanges()`
3. [ ] Add `_mcapToTick()` and `_alignToSpacing()`
4. [ ] Add `mintNextPosition()`
5. [ ] Add `retireOldPosition()`
6. [ ] Add `_mintPosition()` and `_withdrawPosition()`
7. [ ] Update `createPool()` function
8. [ ] Update `PoolState` struct
9. [ ] Add new events

### **Phase 3: Hook Simplification**
1. [ ] Remove rebalancing triggers
2. [ ] Add `PoolProgress` struct
3. [ ] Update `registerLaunch()`
4. [ ] Simplify `beforeSwap()` (only P1 enforcement)
5. [ ] Update `afterSwap()` (epoch tracking + triggers)
6. [ ] Simplify `_calculateHookTax()`
7. [ ] Add new events

### **Phase 4: Config Updates**
1. [ ] Add position overlap constant
2. [ ] Add token allocation array
3. [ ] Add bootstrap requirement constant
4. [ ] Add retirement offset constant

### **Phase 5: Testing**
1. [ ] Compile contracts
2. [ ] Write unit tests for position calculation
3. [ ] Write integration tests for position lifecycle
4. [ ] Test on Sepolia testnet
5. [ ] Gas benchmarking

### **Phase 6: Deployment**
1. [ ] Deploy Config
2. [ ] Deploy Hook
3. [ ] Deploy Factory
4. [ ] Update Hook with Factory address
5. [ ] Create test launch
6. [ ] Monitor first few trades

---

## ⚠️ Critical Notes

1. **V4 PositionManager Integration**
   - Current implementation assumes V4 PositionManager interface
   - May need adjustment based on actual V4 deployment
   - Check Sepolia V4 PositionManager: `0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4`

2. **Tick Spacing**
   - Must align with pool's tick spacing (60 for 1% fee tier)
   - Verify with: `poolManager.tickSpacing(poolKey)`

3. **Bootstrap Amount**
   - 0.001 ETH is ~$2 at current prices
   - Consider making this configurable in Config

4. **Gas Optimization**
   - Lazy minting saves gas if token fails early
   - Position retirement is optional (can be skipped if recycling not needed)
   - Consider batching position actions

5. **Graduation Flag**
   - Ensure graduated flag is checked in ALL hook enforcement paths
   - P2+ should have ZERO hook interference

---

## 🧪 Test Cases to Write

### **Position Calculation Tests**
- [ ] Test MCAP → tick conversion
- [ ] Test 5% overlap calculation
- [ ] Test position ranges don't have gaps
- [ ] Test allocations sum to 100%

### **Position Lifecycle Tests**
- [ ] Test P1 minting at launch
- [ ] Test P2 minting at P1 epoch 2
- [ ] Test position retirement at P3 epoch 1
- [ ] Test ETH recycling into next position

### **Trading Tests**
- [ ] Test swaps in P1 (hook tax active)
- [ ] Test graduation at 16x MCAP
- [ ] Test swaps in P2+ (hook tax disabled)
- [ ] Test large buy crossing position boundary

### **Epoch Tests**
- [ ] Test epoch advancement (MCAP doubling)
- [ ] Test epoch 4 → epoch 1 transition
- [ ] Test position transition events

### **Edge Cases**
- [ ] Test token that never reaches P2
- [ ] Test rapid MCAP growth (multiple epochs in one tx)
- [ ] Test price dip back into retired position

---

## 📊 Gas Comparison

**Old System (per launch lifecycle):**
- Create: ~500k gas
- Rebalance 1: ~300k gas
- Rebalance 2: ~300k gas
- Rebalance 3: ~300k gas
- **Total: ~1.4M gas**

**New System (estimated):**
- Create + P1: ~600k gas
- Lazy mint P2: ~250k gas
- Lazy mint P3: ~250k gas
- Retire P1: ~150k gas
- **Total: ~1.25M gas** (11% savings)

**Per-trade gas:**
- Old: Hook overhead + rebalance checks
- New: Hook overhead only (lighter)
- **Estimated savings: 5-10k gas per trade**

---

## ✅ Definition of Done

**Refactor is complete when:**
- [ ] All rebalancing code removed
- [ ] 5-position system implemented
- [ ] Lazy minting working
- [ ] Position retirement working
- [ ] Graduation is flag-only (no migration)
- [ ] All tests passing
- [ ] Gas benchmarks show improvement
- [ ] Deployed to Sepolia and tested
- [ ] Documentation updated

---

**Ready to begin implementation!** 🚀

Start with Phase 2 (Factory Refactor) as it's the core of the new system.
