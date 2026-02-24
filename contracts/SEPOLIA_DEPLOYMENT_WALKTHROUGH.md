# 🧪 Sepolia Testnet Deployment Walkthrough

## Overview
This is your **practice run** for mainnet deployment. Follow these steps manually to learn the exact flow and estimate gas costs.

---

## 📋 Prerequisites

### 1. Environment Setup

Create/update `.env` file:
```bash
# Sepolia RPC
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Your deployer wallet (will become temporary owner)
DEPLOYER_PRIVATE_KEY=0x... # Your private key

# SAFE treasury address (final owner)
SAFE_ADDRESS=0xFf7549B06E68186C91a6737bc0f0CDE1245e349b

# Uniswap V4 addresses on Base Sepolia
POOL_MANAGER_ADDRESS=0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
POSITION_MANAGER_ADDRESS=0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4

# Factory salt (can be any bytes32)
FACTORY_SALT=0x0000000000000000000000000000000000000000000000000000000000000001
```

### 2. Get Testnet ETH
- Go to https://faucet.quicknode.com/base/sepolia
- Get at least **0.5 ETH** for deployment (we'll track exact costs)

### 3. Verify Foundry
```bash
forge --version
# Should show: forge 0.2.0 or higher
```

---

## 🚀 PHASE 1: DEPLOYMENT

### Step 1: Deploy Config

```bash
cd mainnet-deploy

forge script 01_DeployConfig.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What to watch for:**
- ✅ "Config deployed" message
- ✅ Config address printed
- ✅ Treasury = SAFE address
- ✅ Owner = your deployer address

**Save this info:**
```
CONFIG_ADDRESS=0x... # COPY THIS
Gas Used: _____ # WRITE DOWN
```

**Verify on Basescan Sepolia:**
1. Go to https://sepolia.basescan.org
2. Search for CONFIG_ADDRESS
3. Check: Treasury shows SAFE address
4. Check: Owner shows deployer address

**✅ Checkpoint:** Config deployed and verified

---

### Step 2: Mine Hook Salt

```bash
forge script 02_MineHook.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  -vvv
```

**What to watch for:**
- ⏳ "Mining... (this may take 30-120 seconds)"
- ✅ "HOOK SALT FOUND"
- ✅ Predicted hook address shown
- ✅ "Permission Flags Valid: true"

**Save this info:**
```
HOOK_SALT=0x... # COPY THIS (bytes32)
Predicted Hook Address: 0x... # COPY THIS
```

**Add to .env:**
```bash
HOOK_SALT=0x... # Paste the salt here
```

**✅ Checkpoint:** Hook salt mined (no gas used - view only)

---

### Step 3: Deploy Hook

```bash
forge script 03_DeployHook.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What to watch for:**
- ✅ "Hook deployed" message
- ✅ Hook address matches predicted address from Step 2
- ✅ All permission bits verified (beforeInitialize, beforeSwap, afterSwap, etc.)

**Save this info:**
```
HOOK_ADDRESS=0x... # COPY THIS
Gas Used: _____ # WRITE DOWN
```

**Verify deployed address matches predicted:**
```
Predicted (Step 2): 0x...
Deployed  (Step 3): 0x...
Match: ✅ YES / ❌ NO
```

**Add to .env:**
```bash
HOOK_ADDRESS=0x... # Paste hook address
```

**✅ Checkpoint:** Hook deployed at predicted address

---

### Step 4: Deploy BootstrapETH

```bash
forge script 04_DeployBootstrapETH.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What to watch for:**
- ✅ "Predicted Factory Address" shown
- ✅ "BootstrapETH deployed" message
- ✅ Factory address stored in Bootstrap

**Save this info:**
```
BOOTSTRAP_ETH_ADDRESS=0x... # COPY THIS
Predicted Factory Address: 0x... # COPY THIS (for verification in Step 5)
Gas Used: _____ # WRITE DOWN
```

**Add to .env:**
```bash
BOOTSTRAP_ETH_ADDRESS=0x... # Paste Bootstrap address
```

**✅ Checkpoint:** BootstrapETH deployed with predicted factory

---

### Step 5: Deploy Factory

```bash
forge script 05_DeployFactory.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What to watch for:**
- ✅ "Predicted Factory" matches address from Step 4
- ✅ "Address match confirmed!"
- ✅ "Factory deployed" message
- ✅ Deployed address matches predicted
- ✅ All dependencies wired correctly

**Save this info:**
```
FACTORY_ADDRESS=0x... # COPY THIS
Gas Used: _____ # WRITE DOWN
```

**Verify:**
```
Predicted (Step 4): 0x...
Deployed  (Step 5): 0x...
Match: ✅ YES / ❌ NO
```

**Add to .env:**
```bash
FACTORY_ADDRESS=0x... # Paste factory address
```

**✅ Checkpoint:** Factory deployed and address matches prediction

---

### 📊 Phase 1 Gas Summary

Calculate total gas used:
```
Step 1 (Config):       _____ gas
Step 3 (Hook):         _____ gas
Step 4 (BootstrapETH): _____ gas
Step 5 (Factory):      _____ gas
-----------------------------------
TOTAL DEPLOYMENT:      _____ gas

Estimated ETH cost (at 0.5 gwei): _____ ETH
```

**✅ DEPLOYMENT COMPLETE**

---

## 🔌 PHASE 2: WIRING

### Step 6: Wire Factory to Config

```bash
cd ../mainnet-wire

forge script 01_WireFactory.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What to watch for:**
- ✅ "Current Config State" shows factory = 0x000...000
- ✅ "Factory successfully wired to Config!"
- ✅ Verification: Config.factory() returns FACTORY_ADDRESS

**Save this info:**
```
Gas Used: _____ # WRITE DOWN
```

**Verify on Basescan:**
1. Go to CONFIG_ADDRESS on Basescan Sepolia
2. Click "Read Contract"
3. Call `factory()` → Should return FACTORY_ADDRESS

**✅ Checkpoint:** Factory wired to Config

---

### Step 7: Set SAFE Global Exemption

```bash
forge script 02_SetSafeExemption.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What to watch for:**
- ✅ "Current Exemption Status: SAFE exempt: false"
- ✅ "SAFE successfully exempted!"
- ✅ List of what SAFE can now do (no limits, no taxes)
- ✅ "This exemption is PERMANENT"

**Save this info:**
```
Gas Used: _____ # WRITE DOWN
```

**Verify on Basescan:**
1. Go to HOOK_ADDRESS on Basescan Sepolia
2. Click "Read Contract"
3. Call `globalExemptions(0xFf7549B06E68186C91a6737bc0f0CDE1245e349b)`
4. Should return: `true`

**✅ Checkpoint:** SAFE globally exempted

---

### Step 8: Fund BootstrapETH (Optional)

```bash
# Set funding amount in .env (e.g., 1 ETH = 5 free launches)
BOOTSTRAP_FUNDING_AMOUNT=1000000000000000000  # 1 ETH in wei

forge script 03_FundBootstrapETH.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What to watch for:**
- ✅ "Current BootstrapETH State" shows 0 ETH
- ✅ "BootstrapETH successfully funded!"
- ✅ New balance shown
- ✅ Estimated free launches calculated

**Save this info:**
```
Gas Used: _____ # WRITE DOWN
Funded Amount: 1 ETH
Free Launches: ~5
```

**Verify on Basescan:**
1. Go to BOOTSTRAP_ETH_ADDRESS
2. Check ETH balance = 1 ETH
3. Click "Read Contract"
4. Call `getBalance()` → Should return 1000000000000000000

**✅ Checkpoint:** BootstrapETH funded (optional step)

---

### 📊 Phase 2 Gas Summary

```
Step 6 (Wire Factory):     _____ gas
Step 7 (SAFE Exemption):   _____ gas
Step 8 (Fund Bootstrap):   _____ gas
-----------------------------------
TOTAL WIRING:              _____ gas
```

**✅ WIRING COMPLETE**

---

## ✅ PHASE 3: VERIFICATION

### Verify All Contracts on Basescan

Run verification for each contract:

#### Config
```bash
cd ../mainnet-deploy

forge verify-contract $CONFIG_ADDRESS \
  src/core/ClawclickConfig.sol:ClawclickConfig \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" $SAFE_ADDRESS $YOUR_DEPLOYER_ADDRESS) \
  --watch
```

#### Hook
```bash
forge verify-contract $HOOK_ADDRESS \
  src/core/ClawclickHook_V4.sol:ClawclickHook \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address)" $POOL_MANAGER_ADDRESS $CONFIG_ADDRESS) \
  --watch
```

#### BootstrapETH
```bash
forge verify-contract $BOOTSTRAP_ETH_ADDRESS \
  src/utils/BootstrapETH.sol:BootstrapETH \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address)" $FACTORY_ADDRESS) \
  --watch
```

#### Factory
```bash
forge verify-contract $FACTORY_ADDRESS \
  src/core/ClawclickFactory.sol:ClawclickFactory \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address,address,address)" $CONFIG_ADDRESS $POOL_MANAGER_ADDRESS $HOOK_ADDRESS $POSITION_MANAGER_ADDRESS $BOOTSTRAP_ETH_ADDRESS $YOUR_DEPLOYER_ADDRESS) \
  --watch
```

**Verification Checklist:**
- [ ] Config verified ✅
- [ ] Hook verified ✅
- [ ] BootstrapETH verified ✅
- [ ] Factory verified ✅

**✅ Checkpoint:** All contracts verified on Basescan Sepolia

---

## 🧪 PHASE 4: TESTING

### Manual State Verification

Check each contract's state on Basescan:

#### Config (Read Contract)
```
✅ owner() → Your deployer address
✅ treasury() → SAFE address (0xFf7549...349b)
✅ factory() → FACTORY_ADDRESS
✅ MIN_BOOTSTRAP_ETH() → 200000000000000000 (0.2 ETH)
```

#### Hook (Read Contract)
```
✅ config() → CONFIG_ADDRESS
✅ poolManager() → POOL_MANAGER_ADDRESS
✅ globalExemptions(SAFE_ADDRESS) → true
```

#### BootstrapETH (Read Contract)
```
✅ factory() → FACTORY_ADDRESS
✅ getBalance() → 1000000000000000000 (1 ETH, if funded)
✅ DAILY_LAUNCH_LIMIT() → 50
```

#### Factory (Read Contract)
```
✅ config() → CONFIG_ADDRESS
✅ poolManager() → POOL_MANAGER_ADDRESS
✅ hook() → HOOK_ADDRESS
✅ positionManager() → POSITION_MANAGER_ADDRESS
✅ bootstrapETH() → BOOTSTRAP_ETH_ADDRESS
✅ owner() → Your deployer address
```

### Launch Test Token (Optional)

Test the system works:
```bash
# Create a simple test token
cast send $FACTORY_ADDRESS \
  "createLaunch((string,string,address,address,uint256,(address[5],uint16[5],uint8)))" \
  "(\"Test Token\",\"TEST\",YOUR_ADDRESS,0x0000000000000000000000000000000000000000,1000000000000000000,([0x0,0x0,0x0,0x0,0x0],[0,0,0,0,0],0))" \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --value 0.2ether \
  --legacy
```

**Watch for:**
- ✅ Transaction succeeds
- ✅ TokenLaunched event emitted
- ✅ Token address returned

**✅ Checkpoint:** System tested and working

---

## 🔒 PHASE 5: OWNERSHIP TRANSFER

### ⚠️ FINAL STEP - IRREVERSIBLE

Before running this, verify:
- [ ] All contracts deployed ✅
- [ ] All wiring complete ✅
- [ ] All contracts verified ✅
- [ ] Test token launched ✅
- [ ] SAFE address correct ✅
- [ ] Ready to transfer ownership ✅

### Transfer Ownership to SAFE

```bash
cd ../mainnet-wire

forge script 04_TransferOwnership.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What to watch for:**
- ⚠️ "WARNING: THIS IS IRREVERSIBLE"
- ✅ "FINAL VERIFICATION CHECKLIST" all passed
- ✅ "Factory wired to Config: ✅"
- ✅ "SAFE address verification: ✅ Correct"
- ✅ "ALL CHECKS PASSED ✅"
- ✅ "OWNERSHIP SUCCESSFULLY TRANSFERRED!"
- ✅ Final state shows SAFE as owner

**Save this info:**
```
Gas Used: _____ # WRITE DOWN
```

**Verify on Basescan:**

#### Config Ownership
1. Go to CONFIG_ADDRESS
2. Read Contract → `owner()`
3. Should return: `0xFf7549B06E68186C91a6737bc0f0CDE1245e349b` ✅

#### Factory Ownership
1. Go to FACTORY_ADDRESS
2. Read Contract → `owner()`
3. Should return: `0xFf7549B06E68186C91a6737bc0f0CDE1245e349b` ✅

**✅ Checkpoint:** Ownership transferred to SAFE

---

## 📊 FINAL GAS SUMMARY

### Complete Deployment Costs

```
=== DEPLOYMENT ===
Config:           _____ gas
Hook:             _____ gas
BootstrapETH:     _____ gas
Factory:          _____ gas
SUBTOTAL:         _____ gas

=== WIRING ===
Wire Factory:     _____ gas
SAFE Exemption:   _____ gas
Fund Bootstrap:   _____ gas
SUBTOTAL:         _____ gas

=== OWNERSHIP ===
Transfer:         _____ gas
SUBTOTAL:         _____ gas

=== TOTAL ===
TOTAL GAS:        _____ gas
ETH at 0.5 gwei:  _____ ETH
ETH at 1 gwei:    _____ ETH
ETH at 2 gwei:    _____ ETH
```

### Mainnet Estimate (Base Chain)

```
Estimated Total Gas: _____ (from above)
Base gas price: ~0.05 gwei (cheaper than Sepolia)
Estimated Cost: _____ ETH on Base mainnet
```

---

## ✅ DEPLOYMENT COMPLETE CHECKLIST

### Contracts
- [ ] Config deployed at: `0x...` ✅
- [ ] Hook deployed at: `0x...` ✅
- [ ] BootstrapETH deployed at: `0x...` ✅
- [ ] Factory deployed at: `0x...` ✅

### Wiring
- [ ] Factory wired to Config ✅
- [ ] SAFE globally exempted ✅
- [ ] BootstrapETH funded ✅

### Verification
- [ ] Config verified on Basescan ✅
- [ ] Hook verified on Basescan ✅
- [ ] BootstrapETH verified on Basescan ✅
- [ ] Factory verified on Basescan ✅

### Testing
- [ ] Config state correct ✅
- [ ] Hook state correct ✅
- [ ] BootstrapETH state correct ✅
- [ ] Factory state correct ✅
- [ ] Test token launched ✅

### Ownership
- [ ] Config owned by SAFE ✅
- [ ] Factory owned by SAFE ✅
- [ ] Deployer has no admin access ✅

### Gas Tracking
- [ ] All gas costs recorded ✅
- [ ] Mainnet estimate calculated ✅

---

## 🎯 READY FOR MAINNET

You've now completed the full deployment flow on Sepolia. You know:
- ✅ Exact deployment order
- ✅ What to watch for at each step
- ✅ How to verify on Basescan
- ✅ Gas costs (for mainnet budgeting)
- ✅ How to wire and transfer ownership

**Next:** Deploy on Base mainnet using the same steps!

---

## 📝 Notes for Mainnet

1. **Change RPC:** Use Base mainnet RPC
2. **Real SAFE:** Verify SAFE address is correct
3. **Gas Budget:** Have ~0.5 ETH ready (based on your Sepolia test)
4. **Take Your Time:** Verify each step before proceeding
5. **Save Addresses:** Keep a record of all deployed contracts
6. **Verify Immediately:** Verify contracts right after deployment
7. **Test First:** Launch one test token before going live
8. **SAFE Transfer Last:** Only after everything is tested

---

**Good luck with mainnet deployment! 🚀**
