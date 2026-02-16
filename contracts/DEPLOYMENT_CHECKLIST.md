# 📋 CLAWCLICK V4 - DEPLOYMENT CHECKLIST

Use this checklist to track your mainnet deployment progress.

---

## PRE-DEPLOYMENT

### Environment Setup

- [ ] Foundry installed (`foundryup`)
- [ ] Repository cloned
- [ ] Dependencies installed (`forge install`)
- [ ] Contracts compiled (`forge build`)
- [ ] All scripts validated

### Configuration

- [ ] `PRIVATE_KEY` set (deployer wallet)
- [ ] `MAINNET_RPC_URL` set (Alchemy/Infura)
- [ ] `ETHERSCAN_API_KEY` set (for verification)
- [ ] Treasury address finalized
- [ ] Owner address finalized
- [ ] Deployer wallet funded (0.5+ ETH recommended)

### Pre-Flight Checks

- [ ] Deployer address confirmed: `cast wallet address --private-key $PRIVATE_KEY`
- [ ] Balance confirmed: `cast balance $DEPLOYER_ADDRESS`
- [ ] RPC working: `cast block-number --rpc-url $MAINNET_RPC_URL`
- [ ] Git commit hash recorded: `git rev-parse HEAD`

---

## DEPLOYMENT PHASE 1: CORE

### Step 1: Deploy Config

```bash
forge script script/01_Deployment.t.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

**Checklist:**
- [ ] Transaction confirmed
- [ ] Config address recorded: `____________`
- [ ] Verified on Etherscan
- [ ] Owner verified: `cast call $CONFIG "owner()"`
- [ ] Treasury verified: `cast call $CONFIG "treasury()"`

---

### Step 2: Mine Hook Salt

```bash
export CONFIG=____________  # From Step 1
forge script script/02_MineHook.s.sol --rpc-url $MAINNET_RPC_URL
```

**Checklist:**
- [ ] Script completed successfully
- [ ] Hook address recorded: `____________`
- [ ] Salt recorded: `____________`
- [ ] Address bits verified (159, 157, 155, 153, 152, 149)
- [ ] Verification script run:
  ```python
  address = 0x...  # Your hook address
  required = {159, 157, 155, 153, 152, 149}
  bits = bin(address)[2:].zfill(160)
  for bit in required:
      assert bits[-(bit+1)] == '1', f"Bit {bit} not set!"
  print("✓ All bits valid")
  ```

---

### Step 3: Deploy Hook

```bash
export HOOK_SALT=____________  # From Step 2
forge script script/03_DeployHook.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

**Checklist:**
- [ ] Transaction confirmed
- [ ] Hook deployed at expected address
- [ ] Verified on Etherscan
- [ ] Permissions validated:
  ```bash
  cast call $HOOK "getHookPermissions()(tuple)"
  ```
- [ ] Config linked:
  ```bash
  cast call $HOOK "config()(address)"
  # Expected: $CONFIG
  ```

---

### Step 4: Deploy Locker + Factory

```bash
export HOOK=____________  # From Step 3
forge script script/04_DeployLockerAndFactory.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

**Checklist:**
- [ ] Transaction confirmed
- [ ] Locker address recorded: `____________`
- [ ] Factory address recorded: `____________`
- [ ] Both verified on Etherscan
- [ ] Hook → Locker link verified:
  ```bash
  cast call $HOOK "lpLocker()(address)"
  # Expected: $LOCKER
  ```
- [ ] Locker → Hook link verified:
  ```bash
  cast call $LOCKER "hook()(address)"
  # Expected: $HOOK
  ```
- [ ] Config → Factory link verified:
  ```bash
  cast call $CONFIG "factory()(address)"
  # Expected: $FACTORY
  ```

---

## DEPLOYMENT PHASE 2: VALIDATION

### Step 5: Create Test Launch

```bash
export FACTORY=____________  # From Step 4
forge script script/05_CreateLaunch.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

**Checklist:**
- [ ] Transaction confirmed
- [ ] Token address recorded: `____________`
- [ ] Launch verified:
  ```bash
  cast call $FACTORY "getLaunchByToken(address)(tuple)" $TOKEN
  ```
- [ ] Pool initialized
- [ ] Hook registered
- [ ] Start MCAP confirmed

---

### Step 6: Execute Lifecycle Test

```bash
export TOKEN=____________  # From Step 5
forge script script/06_LiveLifecycleTest.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

**Checklist:**
- [ ] Phase 1 buy completed
- [ ] Epoch progression confirmed
- [ ] Graduation triggered
- [ ] Post-graduation trading works
- [ ] All checks passed

---

## DEPLOYMENT PHASE 3: VERIFICATION

### Etherscan Verification

- [ ] Config verified: `https://etherscan.io/address/$CONFIG#code`
- [ ] Hook verified: `https://etherscan.io/address/$HOOK#code`
- [ ] Locker verified: `https://etherscan.io/address/$LOCKER#code`
- [ ] Factory verified: `https://etherscan.io/address/$FACTORY#code`
- [ ] Test token verified: `https://etherscan.io/address/$TOKEN#code`

### Functional Verification

- [ ] Can create launches
- [ ] Can execute swaps
- [ ] Epochs progress correctly
- [ ] Graduation works at 16x
- [ ] Post-grad trading works
- [ ] Fees distributed correctly

### Security Verification

- [ ] Owner controls verified
- [ ] Access control working
- [ ] Reentrancy protection active
- [ ] No unauthorized access possible

---

## DEPLOYMENT PHASE 4: PRODUCTION

### Frontend Integration

- [ ] Contract addresses updated in frontend
- [ ] ABI files updated
- [ ] RPC endpoints configured
- [ ] Wallet connection tested
- [ ] Launch creation tested
- [ ] Swap UI tested
- [ ] Charts/analytics working

### Monitoring Setup

- [ ] Event listeners deployed
- [ ] Alert system configured
- [ ] Dashboard deployed
- [ ] Gas tracking enabled
- [ ] Error logging enabled

### Documentation

- [ ] User guide published
- [ ] Integration guide published
- [ ] API docs published
- [ ] FAQ created
- [ ] Support channels set up

### Launch Preparation

- [ ] Announcement drafted
- [ ] Marketing materials ready
- [ ] Community notified
- [ ] Partners informed
- [ ] Launch date set

---

## POST-LAUNCH

### Day 1 Monitoring

- [ ] First launch created successfully
- [ ] Swaps executing correctly
- [ ] No errors or reverts
- [ ] Gas usage reasonable
- [ ] Fees distributing correctly

### Week 1 Monitoring

- [ ] Multiple launches successful
- [ ] Graduations occurring
- [ ] Rebalancing working
- [ ] No security issues
- [ ] User feedback positive

### Ongoing

- [ ] Regular health checks
- [ ] Performance monitoring
- [ ] User support active
- [ ] Bug tracking
- [ ] Feature requests logged

---

## ROLLBACK PLAN

If critical issues discovered:

1. **Pause New Launches** (if pause functionality added)
2. **Investigate Issue**
   - Review transaction logs
   - Check contract state
   - Identify root cause
3. **Communicate**
   - Notify users
   - Explain issue
   - Provide timeline
4. **Fix & Redeploy** (if needed)
   - Deploy new contracts
   - Migrate if necessary
   - Resume operations

---

## CONTACTS & SUPPORT

**Repository:** https://github.com/clawclick/claw-click  
**Documentation:** See `contracts/` directory  
**Discord:** https://discord.gg/clawclick  
**Twitter:** @clawclick

---

## SIGN-OFF

### Deployment Completed By

**Name:** ___________________________  
**Date:** ___________________________  
**Role:** ___________________________

### Verification Completed By

**Name:** ___________________________  
**Date:** ___________________________  
**Role:** ___________________________

### Production Launch Approved By

**Name:** ___________________________  
**Date:** ___________________________  
**Role:** ___________________________

---

## DEPLOYMENT ARTIFACTS

Record all deployment information:

```
Network: Ethereum Mainnet
Chain ID: 1

Config:         0x____________
Hook:           0x____________
Locker:         0x____________
Factory:        0x____________
Test Token:     0x____________

Hook Salt:      0x____________
Deploy Block:   ____________
Deploy Date:    ____________
Gas Used:       ____________ ETH
Deployer:       0x____________

Git Commit:     ____________
Build Hash:     ____________
Solc Version:   0.8.26
```

---

## NOTES & OBSERVATIONS

Use this space to record any issues, learnings, or observations during deployment:

```
_________________________________________
_________________________________________
_________________________________________
_________________________________________
_________________________________________
```

---

**Status:** [ ] Pre-Deployment [ ] In Progress [ ] Deployed [ ] Verified [ ] Live

**Last Updated:** _______________

