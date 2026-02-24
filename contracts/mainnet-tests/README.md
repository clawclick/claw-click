# Mainnet Testing Guide

## Overview
This folder contains **complete integration tests** for the Claw.click ecosystem.

These tests should be run on **Base Sepolia testnet** before mainnet deployment to verify everything works correctly.

---

## 🚨 Test Environment

### Use Base Sepolia
```bash
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

### Deploy Full System First
1. Complete all steps in `../mainnet-deploy/`
2. Complete all steps in `../mainnet-wire/`
3. **Then** run these tests

---

## 📋 Test Categories

### 1. Deployment Tests
- ✅ Config deployed correctly
- ✅ Hook mined with correct permissions
- ✅ Factory wired properly
- ✅ BootstrapETH funded

### 2. Token Launch Tests
- ✅ Launch succeeds with valid params (1-10 ETH MCAP)
- ✅ Launch fails below 1 ETH
- ✅ Launch fails above 10 ETH
- ✅ Pool initialized at correct price
- ✅ All 5 positions minted

### 3. Trading Tests (Phase 1 - Pre-Graduation)
- ✅ First buy works (creator 15% within 1 min)
- ✅ Regular buys work (with taxes)
- ✅ Sells work (with taxes)
- ✅ maxTx enforced
- ✅ maxWallet enforced
- ✅ Tax decay at 2x, 4x, 8x, 16x MCAP

### 4. Epoch Tracking Tests
- ✅ Epoch advances on MCAP doubling
- ✅ Tax halves each epoch
- ✅ Graduation triggers at 16x MCAP
- ✅ Position transitions work (P1→P2→P3→P4→P5)

### 5. Post-Graduation Tests (Phase 2+)
- ✅ Hook tax disabled (0%)
- ✅ LP fee active (1%)
- ✅ Limits disabled
- ✅ LP fee collection works
- ✅ Token→ETH swap works
- ✅ 70/30 split works

### 6. Fee Collection Tests
- ✅ Phase 1 fees collected correctly
- ✅ 70/30 split (creator/platform)
- ✅ Fee split wallets work (1-5)
- ✅ Post-graduation LP fees work
- ✅ Treasury receives ETH only (no tokens)

### 7. SAFE Exemption Tests
- ✅ SAFE exempt from taxes
- ✅ SAFE exempt from maxTx
- ✅ SAFE exempt from maxWallet
- ✅ Can hold 15%+ supply
- ✅ Exemption permanent

### 8. Edge Cases
- ✅ Dust swaps rejected (< MIN_SWAP_AMOUNT)
- ✅ Zero liquidity positions handled
- ✅ Multiple tokens work independently
- ✅ BootstrapETH daily limit works
- ✅ BootstrapETH one-time-per-creator works

---

## 🧪 Running Tests

### Run All Tests
```bash
forge test --match-path "mainnet-tests/*.t.sol" \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --ffi \
  -vvv
```

### Run Specific Test Suite
```bash
# Deployment verification
forge test --match-contract "DeploymentTest" --rpc-url $BASE_SEPOLIA_RPC_URL -vvv

# Token launch
forge test --match-contract "LaunchTest" --rpc-url $BASE_SEPOLIA_RPC_URL -vvv

# Full lifecycle (launch → trade → graduate → LP fees)
forge test --match-contract "FullLifecycleTest" --rpc-url $BASE_SEPOLIA_RPC_URL -vvv

# SAFE exemption
forge test --match-contract "SafeExemptionTest" --rpc-url $BASE_SEPOLIA_RPC_URL -vvv
```

### Run Single Test
```bash
forge test --match-test "testLaunchWithValidMcap" --rpc-url $BASE_SEPOLIA_RPC_URL -vvv
```

---

## 📊 Expected Test Results

### All Tests Should Pass ✅
```
Running 47 tests for mainnet-tests/01_DeploymentTest.t.sol
[PASS] testConfigDeployed() (gas: 12456)
[PASS] testHookPermissions() (gas: 23789)
[PASS] testFactoryWired() (gas: 15678)
...

Test result: ok. 47 passed; 0 failed; finished in 45.23s
```

### If Any Test Fails ❌
1. Check contract addresses in `.env`
2. Verify deployment completed successfully
3. Check Base Sepolia has test ETH
4. Review error message for specific issue
5. **DO NOT proceed to mainnet until all tests pass**

---

## 📁 Test Files

### Core Tests
- `01_DeploymentTest.t.sol` - Verify deployment succeeded
- `02_LaunchTest.t.sol` - Token launch functionality
- `03_TradingTest.t.sol` - Buy/sell with taxes
- `04_EpochTest.t.sol` - Epoch tracking and graduation
- `05_LPFeeTest.t.sol` - Post-graduation LP fee collection
- `06_SafeExemptionTest.t.sol` - SAFE treasury exemption
- `07_EdgeCasesTest.t.sol` - Edge cases and limits
- `08_FullLifecycleTest.t.sol` - Complete token lifecycle

### Helper Contracts
- `BaseTest.sol` - Shared test utilities
- `TestHelpers.sol` - Common functions

---

## ✅ Pre-Mainnet Checklist

Before deploying to mainnet, verify:

- [ ] All tests pass on Base Sepolia ✅
- [ ] Launched 3+ test tokens successfully ✅
- [ ] Executed 10+ test swaps (buy/sell) ✅
- [ ] Verified tax decay through epochs ✅
- [ ] Tested graduation (16x MCAP) ✅
- [ ] Collected LP fees post-graduation ✅
- [ ] Verified SAFE exemption works ✅
- [ ] Tested fee split wallets ✅
- [ ] Verified token→ETH swap works ✅
- [ ] No errors in any scenario ✅

---

## 🆘 Common Test Failures

**"Pool already initialized":**
- Previous test didn't clean up
- Use fresh pool key or reset state

**"Insufficient balance":**
- Test wallet needs ETH
- Get Base Sepolia testnet ETH from faucet

**"Hook not found":**
- Factory not wired to Config
- Run wiring scripts first

**"Exceeds maxWallet":**
- Test trying to buy too much
- Either buy less or use exempt address

**"Daily limit reached":**
- BootstrapETH hit 50 launches today
- Wait until midnight UTC or fund BootstrapETH

---

## 📊 Gas Benchmarks (Expected)

These are approximate gas costs on Base Sepolia:

- `createLaunch()`: ~2-3M gas
- `swap()` (Phase 1): ~150-200k gas
- `swap()` (Phase 2+): ~100-150k gas
- `collectFeesFromPosition()`: ~200-250k gas (with swap)
- `setGlobalExemption()`: ~50k gas

---

## 🎯 Success Criteria

All tests must:
1. ✅ Pass without errors
2. ✅ Complete in reasonable time (<5 min total)
3. ✅ Verify expected state changes
4. ✅ Check all event emissions
5. ✅ Validate fee calculations

---

## 🚀 After All Tests Pass

1. ✅ Review test coverage
2. ✅ Document any edge cases found
3. ✅ Verify gas costs are reasonable
4. ✅ **Proceed to mainnet deployment**
5. ✅ Run same tests on mainnet post-deployment (with small amounts)

---

**REMEMBER:** These tests are your safety net. If they don't pass, something is wrong. Do NOT deploy to mainnet until every test passes cleanly.
