# Mainnet Wiring & Configuration Guide

## Overview
This folder contains the **post-deployment configuration** scripts for Claw.click ecosystem.

After completing deployment (mainnet-deploy folder), these scripts wire everything together and transfer ownership to the SAFE multisig.

---

## 🚨 Prerequisites

### Must Have Completed
✅ All 5 deployment steps from `../mainnet-deploy/`
✅ All contract addresses saved in `.env`
✅ All contracts verified on Basescan

### Environment Variables Required
```bash
# Deployment outputs (from mainnet-deploy)
CONFIG_ADDRESS=0x...
HOOK_ADDRESS=0x...
BOOTSTRAP_ETH_ADDRESS=0x...
FACTORY_ADDRESS=0x...

# Deployer (current owner)
DEPLOYER_PRIVATE_KEY=0x...

# SAFE (final owner)
SAFE_ADDRESS=0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
```

---

## 📋 Wiring Sequence

### Step 1: Wire Factory into Config
```bash
forge script mainnet-wire/01_WireFactory.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --legacy
```

**What it does:**
- Calls `Config.setFactory(FACTORY_ADDRESS)`
- Verifies Config.factory() returns correct address
- **CRITICAL:** Must be done before any tokens can be launched

---

### Step 2: Set SAFE Global Exemption
```bash
forge script mainnet-wire/02_SetSafeExemption.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --legacy
```

**What it does:**
- Calls `Hook.setGlobalExemption(SAFE_ADDRESS, true)`
- SAFE becomes permanently exempt from ALL taxes and limits
- Needed for $CLAWS deployment (15% transfer to SAFE)

---

### Step 3: Fund BootstrapETH (Optional)
```bash
forge script mainnet-wire/03_FundBootstrapETH.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --legacy
```

**What it does:**
- Sends initial ETH to BootstrapETH contract (e.g., 50 ETH = 50 free launches)
- Optional: Can fund later by sending ETH directly to BootstrapETH
- Recommended: At least 10 ETH for early adopters

---

### Step 4: Transfer Ownership to SAFE (FINAL STEP)
```bash
forge script mainnet-wire/04_TransferOwnership.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --legacy
```

**What it does:**
- Transfers Config ownership to SAFE
- Transfers Factory ownership to SAFE
- **IRREVERSIBLE:** Deployer loses all admin access
- **ONLY RUN THIS AFTER VERIFYING EVERYTHING WORKS**

---

## ⚠️ CRITICAL WARNINGS

### Before Step 4 (Ownership Transfer):
1. ✅ Verify all contracts on Basescan
2. ✅ Test launching a token on testnet
3. ✅ Verify Factory is wired into Config
4. ✅ Verify SAFE exemption is set
5. ✅ Verify all addresses are correct
6. ✅ **NO GOING BACK AFTER THIS**

### After Step 4:
- ❌ Deployer wallet has NO admin access
- ✅ SAFE multisig controls everything
- ✅ All future config changes require 3-sig approval
- ✅ Ecosystem is decentralized

---

## 🧪 Verification Checklist

After wiring, verify all connections:

### Config Verification
```solidity
Config.factory() == FACTORY_ADDRESS ✅
Config.treasury() == SAFE_ADDRESS ✅
Config.owner() == SAFE_ADDRESS ✅ (after Step 4)
```

### Hook Verification
```solidity
Hook.config() == CONFIG_ADDRESS ✅
Hook.globalExemptions(SAFE_ADDRESS) == true ✅
```

### Factory Verification
```solidity
Factory.config() == CONFIG_ADDRESS ✅
Factory.hook() == HOOK_ADDRESS ✅
Factory.bootstrapETH() == BOOTSTRAP_ETH_ADDRESS ✅
Factory.owner() == SAFE_ADDRESS ✅ (after Step 4)
```

### BootstrapETH Verification
```solidity
BootstrapETH.factory() == FACTORY_ADDRESS ✅
BootstrapETH.getBalance() >= MIN_BOOTSTRAP_ETH ✅ (if funded)
```

---

## 📊 Expected Execution Time

- Step 1 (Wire Factory): ~15 seconds
- Step 2 (SAFE Exemption): ~15 seconds
- Step 3 (Fund Bootstrap): ~15 seconds
- Step 4 (Transfer Ownership): ~30 seconds
- **Total:** ~2-3 minutes

---

## 🔍 Testing Before Ownership Transfer

### Recommended Test Flow
1. Deploy a test token on mainnet (using deployer wallet)
2. Verify token appears correctly
3. Execute test swaps (buy/sell)
4. Verify fees are collected
5. Verify limits work
6. **Only after successful testing → proceed to Step 4**

---

## 🆘 Troubleshooting

**"Factory not set" error:**
- Step 1 (Wire Factory) was not executed
- Run Step 1 before launching any tokens

**"SAFE exemption not working":**
- Step 2 was not executed
- Run Step 2 before transferring tokens to SAFE

**"Cannot transfer ownership":**
- Caller must be current owner (deployer)
- Verify DEPLOYER_PRIVATE_KEY is correct

**"Bootstrap ETH out of funds":**
- Run Step 3 to fund BootstrapETH
- Or send ETH directly: `cast send $BOOTSTRAP_ETH_ADDRESS --value 10ether`

---

## 📁 Files in This Folder

- `01_WireFactory.s.sol` - Connect Factory to Config
- `02_SetSafeExemption.s.sol` - Exempt SAFE from taxes/limits
- `03_FundBootstrapETH.s.sol` - Initial Bootstrap funding
- `04_TransferOwnership.s.sol` - Final ownership transfer to SAFE
- `README.md` - This file

---

## ✅ Wiring Checklist

- [ ] Step 1: Factory wired to Config ✅
- [ ] Step 2: SAFE exemption set ✅
- [ ] Step 3: BootstrapETH funded (optional) ✅
- [ ] Step 4: Ownership transferred to SAFE ✅
- [ ] All contracts verified on Basescan ✅
- [ ] Test token launched successfully ✅
- [ ] **ECOSYSTEM IS LIVE** 🚀
