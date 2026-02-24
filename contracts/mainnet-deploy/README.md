# Mainnet Deployment Guide

## Overview
This folder contains the **complete deployment sequence** for Claw.click ecosystem on Base mainnet.

## 🚨 Prerequisites

### Environment Variables Required
```bash
# Base Mainnet RPC
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Deployer Private Key (will become owner initially)
DEPLOYER_PRIVATE_KEY=0x...

# SAFE Multisig Address (final owner)
SAFE_ADDRESS=0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
```

### Contract Addresses (Base Mainnet)
```
Uniswap V4 PoolManager: 0x... (check Base docs)
Uniswap V4 PositionManager: 0x... (check Base docs)
CREATE2 Deployer: 0x4e59b44847b379578588920cA78FbF26c0B4956C
```

---

## 📋 Deployment Sequence

### Step 1: Deploy Config
```bash
forge script mainnet-deploy/01_DeployConfig.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --legacy
```

**Output:** `CONFIG_ADDRESS`

**What it does:**
- Deploys ClawclickConfig with SAFE as treasury and deployer as temporary owner
- Sets platform constants (min bootstrap, mcap multiplier, etc.)

---

### Step 2: Mine Hook Address
```bash
forge script mainnet-deploy/02_MineHook.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL
```

**Output:** `HOOK_SALT` (bytes32)

**What it does:**
- Finds a valid salt that produces a hook address with correct permission bits
- This is a **view-only** operation (no broadcasting)
- Copy the salt to your `.env` file

---

### Step 3: Deploy Hook
```bash
forge script mainnet-deploy/03_DeployHook.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --legacy
```

**Output:** `HOOK_ADDRESS`

**What it does:**
- Deploys ClawclickHook_V4 using the mined salt
- Connects to PoolManager and Config
- Verifies permission bits are correct

---

### Step 4: Deploy BootstrapETH
```bash
forge script mainnet-deploy/04_DeployBootstrapETH.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --legacy
```

**Output:** `BOOTSTRAP_ETH_ADDRESS`

**What it does:**
- Deploys BootstrapETH contract (must be deployed BEFORE factory)
- Sets factory address to `address(0)` temporarily
- Will be updated in wiring step

---

### Step 5: Deploy Factory
```bash
forge script mainnet-deploy/05_DeployFactory.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --legacy
```

**Output:** `FACTORY_ADDRESS`

**What it does:**
- Deploys ClawclickFactory with all dependencies
- Connects to Config, Hook, PoolManager, PositionManager, BootstrapETH
- Deployer becomes initial owner

---

## 🔌 Next Steps

After deployment, proceed to `../mainnet-wire/README.md` for:
1. Wiring Factory into Config
2. Setting SAFE exemption
3. Funding BootstrapETH (optional)
4. Transferring ownership to SAFE

---

## 📊 Verification

After Step 5, verify all contracts on BaseScan:
- Config: Check treasury == SAFE
- Hook: Check config, poolManager, and permissions
- Factory: Check all dependencies wired correctly
- BootstrapETH: Check factory address set

---

## ⚠️ Important Notes

1. **DO NOT transfer ownership to SAFE until wiring is complete**
2. **Save all deployed addresses** - you'll need them for wiring
3. **Verify each contract on Basescan** before proceeding
4. **Test on testnet first** - use these same scripts on Base Sepolia
5. **Gas prices** - Use `--legacy` flag for deterministic gas pricing

---

## 🆘 Troubleshooting

**Hook deployment fails:**
- Verify salt is correct (check 02_MineHook output)
- Ensure CREATE2 deployer exists at expected address
- Check permission bits match exactly

**Factory deployment fails:**
- Verify all dependency addresses are correct
- Ensure BootstrapETH is deployed first
- Check PoolManager and PositionManager addresses

**Out of gas:**
- Increase gas limit: `--gas-limit 10000000`
- Check Base mainnet gas prices are reasonable

---

## 📁 Files in This Folder

- `01_DeployConfig.s.sol` - Deploy configuration contract
- `02_MineHook.s.sol` - Find valid hook address salt
- `03_DeployHook.s.sol` - Deploy hook with mined salt
- `04_DeployBootstrapETH.s.sol` - Deploy bootstrap funding
- `05_DeployFactory.s.sol` - Deploy factory (final step)
- `README.md` - This file

---

## 🎯 Expected Deployment Time

- Each step: ~30-60 seconds
- Total time: ~5-10 minutes
- Plus verification time: ~10-20 minutes

---

## ✅ Deployment Checklist

- [ ] Step 1: Config deployed ✅
- [ ] Step 2: Hook salt mined ✅
- [ ] Step 3: Hook deployed ✅
- [ ] Step 4: BootstrapETH deployed ✅
- [ ] Step 5: Factory deployed ✅
- [ ] All contracts verified on Basescan ✅
- [ ] Proceed to mainnet-wire folder ✅
