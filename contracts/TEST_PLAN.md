# 🧪 Multi-Position System - Complete Test Plan

## ✅ COMPLETED TESTS

### MP_01_ConfigTest.sol ✅
**Status:** Complete  
**Tests:** 12 tests covering all configuration constants  
**Coverage:**
- Token allocation sums (100% verification)
- Individual allocation values
- Geometric decay validation
- MCAP multiplier (16x)
- Position overlap (5%)
- Retirement offset (2)
- Bootstrap minimum (0.001 ETH)
- Base tax (50%)
- Platform share bounds
- Pause functionality

### MP_02_PositionMathTest.sol ✅
**Status:** Complete  
**Tests:** 12 tests covering position range calculations  
**Coverage:**
- Token allocation calculations
- MCAP milestone overflow protection
- 16x multiplier per position
- sqrtPrice calculation
- Position overlap (5% on each side)
- Tick alignment (spacing 60)
- Tick bounds validation
- Full position math (2k example)
- Min/max MCAP edge cases
- Revert conditions

---

## 📋 REMAINING TESTS TO IMPLEMENT

### MP_03_LaunchTest.sol (HIGH PRIORITY)
**Purpose:** Test createLaunch() with bootstrap system  
**Key Tests:**
1. Valid launch with 0.001 ETH bootstrap
2. P1 minted immediately
3. P2-P5 not minted at launch
4. Pool activated = true immediately
5. PoolState stored correctly
6. tokenIdToPoolId mapping created
7. LaunchInfo stored correctly
8. Bootstrap ETH used for P1 liquidity
9. Token supply minted to factory
10. Revert below min bootstrap
11. Revert invalid params
12. Revert when paused

**Expected Results:**
- Launch succeeds with $2 bootstrap
- Only P1 exists (75% tokens)
- Pool immediately tradeable
- Remaining positions = unminted

---

### MP_04_EpochTrackingTest.sol (CRITICAL)
**Purpose:** Verify epoch detection via MCAP doubling  
**Key Tests:**
1. Epoch 1 starts at launch
2. Doubling triggers epoch 2 (2k → 4k)
3. Second doubling triggers epoch 3 (4k → 8k)
4. Third doubling triggers epoch 4 (8k → 16k)
5. Fourth doubling triggers graduation (16k → 32k)
6. Epoch advancement emits event
7. lastEpochMCAP updated correctly
8. Tax rate changes with epoch
9. Multiple swaps in same epoch don't advance
10. Fractional doublings don't trigger

**Expected Results:**
- Epochs advance on exact doublings
- Tax halves each epoch (50% → 25% → 12.5% → 6.25%)
- lastEpochMCAP tracks correctly

---

### MP_05_GraduationTest.sol (CRITICAL - HIGHEST PRIORITY)
**Purpose:** Test graduation timing (must happen BEFORE epoch++)  
**Key Tests:**
1. Graduation at P1 epoch 4 end (16x MCAP)
2. Graduation check happens BEFORE currentEpoch++
3. Hook tax disabled after graduation
4. LP fee (1%) enabled after graduation
5. Phase changes to GRADUATED
6. graduationMCAP stored correctly
7. graduated flag set to true
8. Smooth transition to P2
9. No double graduation
10. Irreversible graduation

**Expected Results:**
- Graduation at exactly 16x starting MCAP
- Timing: check happens BEFORE epoch increment
- Smooth P1 → P2 transition with 5% overlap

**Critical Scenario:**
```
MCAP reaches 32k (16x of 2k):
1. afterSwap() detects currentMCAP >= 16x
2. Checks: position==1 && epoch==4 && !graduated
3. Sets graduated = true (BEFORE epoch++)
4. THEN advances epoch
5. Position transition happens
```

---

### MP_06_PositionMintingTest.sol (HIGH PRIORITY)
**Purpose:** Test lazy minting triggers  
**Key Tests:**
1. P2 mints at P1 epoch 2 (4k MCAP)
2. P3 mints at P2 epoch 2 (64k MCAP)
3. P4 mints at P3 epoch 2 (1M MCAP)
4. P5 mints at P4 epoch 2 (16M MCAP)
5. Position uses pre-calculated ranges
6. Token allocation correct (18.75%, 4.69%, etc.)
7. Recycled ETH added to new position
8. tokenIdToPoolId mapping created
9. positionMinted flag set
10. Hook triggers factory.mintNextPosition()
11. Revert if already minted
12. Only Hook can trigger

**Expected Results:**
- Positions mint exactly at epoch 2 of previous
- Uses bootstrap + recycled ETH
- Smooth capital flow

---

### MP_07_PositionRetirementTest.sol (HIGH PRIORITY)
**Purpose:** Test capital recycling system  
**Key Tests:**
1. P1 retires at P3 epoch 1 (128k MCAP)
2. P2 retires at P4 epoch 1 (2M MCAP)
3. P3 retires at P5 epoch 1 (32M MCAP)
4. P4 and P5 never retire
5. Retirement offset = 2 positions
6. All liquidity withdrawn (decreaseLiquidity 100%)
7. ETH recovered and stored in recycledETH
8. Tokens recovered (sent to treasury)
9. NFT burned
10. positionRetired flag set
11. Hook triggers factory.retireOldPosition()
12. Revert if not minted / already retired

**Expected Results:**
- ETH recycled into future positions
- Capital efficiency maintained
- No ETH stuck in old positions

---

### MP_08_FullLifecycleTest.sol (INTEGRATION TEST)
**Purpose:** Complete 2k → 128M+ journey  
**Key Tests:**
1. Launch with 2k MCAP ($2 bootstrap)
2. Trade through P1 epochs 1-4
3. Graduation at 32k MCAP
4. P2 minted at 4k (P1 epoch 2)
5. P3 minted at 64k (P2 epoch 2)
6. P1 retired at 128k (P3 epoch 1)
7. P4 minted at 1M (P3 epoch 2)
8. P2 retired at 2M (P4 epoch 1)
9. P5 minted at 16M (P4 epoch 2)
10. P3 retired at 32M (P5 epoch 1)
11. Final state: P4 + P5 active
12. All capital recycled correctly

**Expected Results:**
- Smooth progression through all 5 positions
- No manual intervention required
- Capital recycled at each retirement
- System scales to 128M+ MCAP

**Verification Points:**
```
Launch:     2k → P1 active (75% tokens)
Epoch 2:    4k → P2 minted (18.75% tokens)
Epoch 3:    8k → P3 minted (4.69% tokens)
Epoch 4:   16k → Graduation
P2 Epoch 1: 32k → Transition to P2
P2 Epoch 2: 64k → P4 minted (1.17% tokens)
P3 Epoch 1: 128k → P1 retired, ETH recycled
P3 Epoch 2: 256k → Continue...
P4 Epoch 1: 2M → P2 retired
P4 Epoch 2: 4M → P5 minted (0.39% tokens)
P5 Epoch 1: 32M → P3 retired
P5+: 128M+ → Final state (P4 + P5)
```

---

### MP_09_EdgeCasesTest.sol (MEDIUM PRIORITY)
**Purpose:** Weird scenarios and attack vectors  
**Key Tests:**
1. Double minting prevention
2. Double retirement prevention
3. Retirement before minting (should revert)
4. Mint when already minted (should revert)
5. Access control (only Hook can trigger)
6. Reentrancy protection
7. Integer overflow edge cases
8. Zero liquidity scenarios
9. Price manipulation attempts
10. Flash loan attacks (if applicable)
11. Front-running protection
12. MEV extraction scenarios

**Expected Results:**
- All state guards work
- No unauthorized access
- No reentrancy vulnerabilities
- No capital loss

---

### MP_10_GasOptimizationTest.sol (LOW PRIORITY)
**Purpose:** Benchmark gas usage  
**Key Tests:**
1. Launch gas cost
2. First swap gas cost (P1 epoch 1)
3. Epoch advancement gas cost
4. Position minting gas cost
5. Position retirement gas cost
6. Graduation gas cost
7. Full lifecycle total gas
8. Compare to old system
9. Worst-case scenario
10. Best-case scenario

**Expected Results:**
- Launch: ~350k gas
- Swap: ~170k gas
- Position mint: ~280k gas
- Position retire: ~200k gas
- Full lifecycle: ~19M gas (11% better than old system)

---

## 🎯 TESTING PRIORITIES

### CRITICAL (Must pass before deployment):
1. **MP_05_GraduationTest** - Timing is everything
2. **MP_04_EpochTrackingTest** - Doubling detection
3. **MP_03_LaunchTest** - Bootstrap system
4. **MP_06_PositionMintingTest** - Lazy minting
5. **MP_07_PositionRetirementTest** - Capital recycling

### HIGH (Important for system integrity):
6. **MP_08_FullLifecycleTest** - End-to-end verification
7. **MP_09_EdgeCasesTest** - Security testing

### MEDIUM (Nice to have):
8. **MP_10_GasOptimizationTest** - Performance metrics

---

## 🚀 NEXT STEPS

### Phase 1: Implement Critical Tests
1. Create MP_03 through MP_07
2. Run test suite: `forge test -vv`
3. Fix any failing tests
4. Achieve 100% pass rate

### Phase 2: Integration Testing
1. Create MP_08 (full lifecycle)
2. Deploy to Sepolia testnet
3. Execute real transactions
4. Verify all transitions

### Phase 3: Security & Performance
1. Create MP_09 (edge cases)
2. Create MP_10 (gas benchmarks)
3. Third-party audit (if applicable)
4. Bug bounty program

### Phase 4: Mainnet Deployment
1. Final security review
2. Deploy to mainnet (Base, ETH, BSC)
3. Monitor first launches
4. Celebrate! 🎉

---

## 📊 TEST COVERAGE GOALS

- **Config:** 100% ✅
- **Position Math:** 100% ✅
- **Launch:** 95%+ ⏳
- **Epoch Tracking:** 100% ⏳
- **Graduation:** 100% ⏳
- **Minting:** 95%+ ⏳
- **Retirement:** 95%+ ⏳
- **Lifecycle:** 100% ⏳
- **Edge Cases:** 90%+ ⏳
- **Gas:** Benchmarked ⏳

---

## 🔍 KEY VERIFICATION POINTS

### Mathematical Correctness:
- ✅ Token allocations sum to 100%
- ✅ MCAP milestones don't overflow
- ✅ Position ranges have 5% overlap
- ✅ Tick alignment to spacing 60
- ⏳ sqrtPrice calculations accurate
- ⏳ Epoch doubling detection works

### System Behavior:
- ⏳ Bootstrap launches correctly
- ⏳ Lazy minting at epoch 2
- ⏳ Retirement at 2 positions back
- ⏳ Capital recycling works
- ⏳ Graduation timing correct
- ⏳ No manual intervention needed

### Security:
- ⏳ Access control enforced
- ⏳ Reentrancy protected
- ⏳ State guards work
- ⏳ No capital loss
- ⏳ No overflow/underflow
- ⏳ Immutable after deployment

---

## 📝 NOTES FOR TEST IMPLEMENTATION

### Common Setup:
```solidity
ClawclickFactory factory;
ClawclickConfig config;
ClawclickHook hook;
IPoolManager poolManager;
IPositionManager positionManager;

function setUp() public {
    // Deploy contracts
    config = new ClawclickConfig(treasury, owner);
    hook = new ClawclickHook(poolManager, config);
    factory = new ClawclickFactory(config, poolManager, hook, positionManager, owner);
    config.setFactory(address(factory));
}
```

### Helper Functions:
```solidity
function launchToken() internal returns (address token, PoolId poolId) {
    ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
        name: "Test Token",
        symbol: "TEST",
        beneficiary: address(this),
        agentWallet: address(this),
        isPremium: false,
        targetMcapETH: 2 ether
    });
    
    return factory.createLaunch{value: 0.001 ether + factory.microFee()}(params);
}

function buyTokens(uint256 ethAmount) internal {
    // Execute swap via PoolManager
}

function getCurrentMCAP(PoolId poolId) internal view returns (uint256) {
    return hook.getCurrentMcap(poolId);
}
```

### Assertion Patterns:
```solidity
// Check position minted
assertTrue(poolStates[poolId].positionMinted[index], "Position not minted");

// Check epoch advanced
assertEq(progress.currentEpoch, expectedEpoch, "Epoch not advanced");

// Check graduation
assertTrue(progress.graduated, "Not graduated");

// Check capital recycled
assertGt(poolStates[poolId].recycledETH, 0, "No ETH recycled");
```

---

**Ready to implement the remaining tests!** 🚀

The foundation is solid - now we build comprehensive test coverage to prove the system is bulletproof.
