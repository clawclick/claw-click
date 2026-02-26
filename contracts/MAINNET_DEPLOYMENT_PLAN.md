# 🚀 CLAW.CLICK MAINNET DEPLOYMENT PLAN
## Base Mainnet - PRODUCTION

---

## ⚠️ CRITICAL INFORMATION

**Network:** Base Mainnet  
**Deployer:** 0x958fC4d5688F7e7425EEa770F54d5126a46A9104  
**Treasury (SAFE):** 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b  
**Required Funding:** 0.05 ETH minimum (recommended 0.1 ETH for safety)  

**RPC Endpoint:** https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J  
**Block Explorer:** https://basescan.org  
**Etherscan API:** 69U9FKJK6A46748RA94DYBRJSQCHC8191C  

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Environment Variables (.env)
The following variables MUST be set in `.env`:

```bash
# Deployer (YOU WILL PROVIDE PK)
MAINNET_DEPLOYER=0x958fC4d5688F7e7425EEa770F54d5126a46A9104
MAINNET_DEPLOYER_PK=<WILL_BE_PROVIDED>

# RPC & API
ALCHEMY_API_BASE=https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
ETHERSCAN_API_KEY=69U9FKJK6A46748RA94DYBRJSQCHC8191C

# SAFE Treasury
SAFE_ADDRESS=0xFf7549B06E68186C91a6737bc0f0CDE1245e349b

# Uniswap V4 (Official Base Mainnet)
POOL_MANAGER=0x498581ff718922c3f8e6a244956af099b2652b2b
POSITION_MANAGER=0x7c5f5a4bbd8fd63184577525326123b519429bdc

# Deploy Salts (MUST SET BEFORE DEPLOYMENT)
FACTORY_SALT=0x0000000000000000000000000000000000000000000000000000000000000001

# Deployed Addresses (WILL BE FILLED DURING DEPLOYMENT)
CONFIG_ADDRESS=
HOOK_SALT=
HOOK_ADDRESS=
BOOTSTRAP_ETH_ADDRESS=
FACTORY_ADDRESS=

# Optional Funding (for BootstrapETH - Step 3 of wiring)
BOOTSTRAP_FUNDING_AMOUNT=10000000000000000000  # 10 ETH in wei
```

### ✅ Script Updates Required
ALL deployment scripts currently use wrong variable names and need updating:
- `DEPLOYER_PRIVATE_KEY` → `MAINNET_DEPLOYER_PK`
- `POOL_MANAGER_ADDRESS` → `POOL_MANAGER`
- `POSITION_MANAGER_ADDRESS` → `POSITION_MANAGER`
- `FACTORY_ADDRESS` → Will be set after deployment

---

## 📝 DEPLOYMENT SEQUENCE

### PHASE 1: CORE CONTRACTS DEPLOYMENT

#### Step 1: Deploy Config
**Script:** `mainnet-deploy/01_DeployConfig.s.sol`

**What it does:**
- Deploys ClawclickConfig with SAFE as treasury
- Sets deployer as temporary owner (will transfer to SAFE later)
- Configures all platform constants

**Command:**
```bash
forge script mainnet-deploy/01_DeployConfig.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --verify \
  --legacy
```

**Output:**
- `CONFIG_ADDRESS` → Save to .env

**Verification:**
- Check Config owner == deployer
- Check Config treasury == SAFE address
- Verify on Basescan

---

#### Step 2: Mine Hook Address
**Script:** `mainnet-deploy/02_MineHook.s.sol`

**What it does:**
- Finds a valid CREATE2 salt for hook address
- Hook address MUST have correct permission bits for Uniswap V4
- This is a VIEW operation (no transaction, no gas)

**Command:**
```bash
forge script mainnet-deploy/02_MineHook.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
```

**Output:**
- `HOOK_SALT` (bytes32) → Save to .env
- Predicted hook address → Verify permission bits

**Time:** 30-120 seconds  
**No gas cost** (view only)

---

#### Step 3: Deploy Hook
**Script:** `mainnet-deploy/03_DeployHook.s.sol`

**What it does:**
- Deploys ClawclickHook_V4 using salt from Step 2
- Connects to PoolManager and Config
- Verifies deployed address has correct permissions

**Command:**
```bash
forge script mainnet-deploy/03_DeployHook.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --verify \
  --legacy
```

**Output:**
- `HOOK_ADDRESS` → Save to .env

**Verification:**
- Check Hook permission bits
- Verify Hook.poolManager == POOL_MANAGER
- Verify Hook.config == CONFIG_ADDRESS
- Verify on Basescan

---

#### Step 4: Deploy BootstrapETH
**Script:** `mainnet-deploy/04_DeployBootstrapETH.s.sol`

**What it does:**
- Predicts Factory address using CREATE2
- Deploys BootstrapETH with predicted Factory address
- Factory MUST be deployed at this exact address in Step 5

**Command:**
```bash
forge script mainnet-deploy/04_DeployBootstrapETH.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --verify \
  --legacy
```

**Output:**
- `BOOTSTRAP_ETH_ADDRESS` → Save to .env
- Predicted `FACTORY_ADDRESS` → Verify Step 5 matches this

**⚠️ CRITICAL:** Note the predicted Factory address!

---

#### Step 5: Deploy Factory
**Script:** `mainnet-deploy/05_DeployFactory.s.sol`

**What it does:**
- Deploys ClawclickFactory using CREATE2 with FACTORY_SALT
- MUST use same salt as Step 4 to match predicted address
- Connects all dependencies (Config, Hook, PoolManager, PositionManager)
- Sets deployer as temporary owner

**Command:**
```bash
forge script mainnet-deploy/05_DeployFactory.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --verify \
  --legacy
```

**Output:**
- `FACTORY_ADDRESS` → Save to .env

**⚠️ CRITICAL VERIFICATION:**
- Deployed Factory address MUST match predicted address from Step 4
- If addresses don't match, STOP and investigate!

---

### PHASE 2: WIRING & CONFIGURATION

#### Step 6: Wire Factory to Config
**Script:** `mainnet-wire/01_WireFactory.s.sol`

**What it does:**
- Calls Config.setFactory(FACTORY_ADDRESS)
- Enables token launching functionality

**Command:**
```bash
forge script mainnet-wire/01_WireFactory.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --legacy
```

**Verification:**
- Check Config.factory() == FACTORY_ADDRESS

---

#### Step 7: Set SAFE Exemption
**Script:** `mainnet-wire/02_SetSafeExemption.s.sol`

**What it does:**
- Sets SAFE as globally exempt from ALL taxes and limits
- PERMANENT - cannot be reversed
- Applies to ALL tokens (current and future)

**Command:**
```bash
forge script mainnet-wire/02_SetSafeExemption.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --legacy
```

**Verification:**
- Check Hook.globalExemptions(SAFE) == true

---

#### Step 8: Fund BootstrapETH (OPTIONAL)
**Script:** `mainnet-wire/03_FundBootstrapETH.s.sol`

**What it does:**
- Sends ETH to BootstrapETH contract
- Enables free launches for first-time creators
- Can be done anytime (not blocking for ownership transfer)

**Command:**
```bash
forge script mainnet-wire/03_FundBootstrapETH.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --legacy
```

**Amount:** 10 ETH = 50 free launches (0.2 ETH each)

**Alternative:** Send ETH directly:
```bash
cast send $BOOTSTRAP_ETH_ADDRESS --value 10ether --private-key $MAINNET_DEPLOYER_PK
```

---

### PHASE 3: TESTING & VERIFICATION (BEFORE OWNERSHIP TRANSFER!)

**⚠️ DO NOT PROCEED TO STEP 9 UNTIL ALL TESTING IS COMPLETE!**

#### Manual Testing Checklist:
- [ ] Verify ALL contracts on Basescan
- [ ] Launch a test token (AGENT flow)
- [ ] Launch a test token (HUMAN flow - no limits)
- [ ] Execute buy swaps on both tokens
- [ ] Execute sell swaps on both tokens
- [ ] Verify fees are collected correctly
- [ ] Verify SAFE receives platform fees
- [ ] Verify creator receives their fee split
- [ ] Check hook address permission bits
- [ ] Test maxTx and maxWallet limits (AGENT only)
- [ ] Verify SAFE exemption works
- [ ] Check all wiring connections
- [ ] Verify Config.factory is set
- [ ] Test multiple positions (P1 → P5)
- [ ] Monitor gas costs
- [ ] Check BootstrapETH balance and limits

---

#### Step 9: Transfer Ownership to SAFE (⚠️ IRREVERSIBLE!)
**Script:** `mainnet-wire/04_TransferOwnership.s.txt` (currently disabled)

**⚠️ THIS FILE IS A .txt FILE TO PREVENT ACCIDENTAL EXECUTION!**

**What it does:**
- Transfers Config ownership to SAFE
- Transfers Factory ownership to SAFE
- Deployer loses ALL admin access
- SAFE multisig gains full control

**Before running:**
- ✅ All contracts verified on Basescan
- ✅ All test launches successful
- ✅ All swaps working correctly
- ✅ Fee distribution verified
- ✅ SAFE exemption verified
- ✅ ALL addresses double-checked
- ✅ Team approval obtained

**To execute:**
1. Rename file: `04_TransferOwnership.s.txt` → `04_TransferOwnership.s.sol`
2. Run command:
```bash
forge script mainnet-wire/04_TransferOwnership.s.sol \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --legacy
```

**After this:**
- 🚫 Deployer has ZERO admin powers
- ✅ SAFE controls everything
- ✅ All config changes require 3-sig approval
- ✅ Ecosystem is fully decentralized

---

## 📊 DEPLOYMENT SUMMARY TABLE

| Step | Script | Action | Output | Gas Est. |
|------|--------|--------|--------|----------|
| 1 | 01_DeployConfig | Deploy Config | CONFIG_ADDRESS | ~0.002 ETH |
| 2 | 02_MineHook | Mine salt (view) | HOOK_SALT | 0 ETH |
| 3 | 03_DeployHook | Deploy Hook | HOOK_ADDRESS | ~0.01 ETH |
| 4 | 04_DeployBootstrapETH | Deploy Bootstrap | BOOTSTRAP_ETH_ADDRESS | ~0.003 ETH |
| 5 | 05_DeployFactory | Deploy Factory | FACTORY_ADDRESS | ~0.015 ETH |
| 6 | 01_WireFactory | Wire Factory | - | ~0.0005 ETH |
| 7 | 02_SetSafeExemption | Set exemption | - | ~0.0005 ETH |
| 8 | 03_FundBootstrapETH | Fund (optional) | - | 10+ ETH |
| 9 | 04_TransferOwnership | Transfer (final) | - | ~0.001 ETH |

**Total Gas:** ~0.035 ETH (excluding optional funding)  
**Recommended Funding:** 0.1 ETH (includes buffer for gas price spikes)

---

## 🔧 REQUIRED SCRIPT UPDATES

Before deployment, the following variable names must be updated in ALL scripts:

### Search and Replace:
```
DEPLOYER_PRIVATE_KEY → MAINNET_DEPLOYER_PK
POOL_MANAGER_ADDRESS → POOL_MANAGER
POSITION_MANAGER_ADDRESS → POSITION_MANAGER
```

### Files to Update:
- `mainnet-deploy/01_DeployConfig.s.sol`
- `mainnet-deploy/02_MineHook.s.sol`
- `mainnet-deploy/03_DeployHook.s.sol`
- `mainnet-deploy/04_DeployBootstrapETH.s.sol`
- `mainnet-deploy/05_DeployFactory.s.sol`
- `mainnet-wire/01_WireFactory.s.sol`
- `mainnet-wire/02_SetSafeExemption.s.sol`
- `mainnet-wire/03_FundBootstrapETH.s.sol`
- `mainnet-wire/04_TransferOwnership.s.txt`

---

## 🎯 LAUNCH FLOWS

### AGENT Launch (with Hook/Limits):
1. User calls Factory.createLaunch() with LaunchType.AGENT (1)
2. Hook enforces:
   - maxTx limits (starts at 1% of supply)
   - maxWallet limits (starts at 2% of supply)
   - Progressive taxes (starts at 30%, decreases over time)
3. Positions auto-adjust through P1 → P5
4. No graduation target (immortal pool)

### HUMAN Launch (no Hook/Limits):
1. User calls Factory.createLaunch() with LaunchType.DIRECT (0)
2. Hook is BYPASSED completely
3. No maxTx, no maxWallet, no taxes
4. Standard Uniswap V4 pool
5. Positions work same as AGENT

---

## 🔐 SECURITY NOTES

1. **Private Key Security:**
   - Never commit MAINNET_DEPLOYER_PK to git
   - Store in secure vault after deployment
   - Only use for this one deployment session

2. **Address Verification:**
   - Double-check ALL addresses before each step
   - Verify SAFE address: 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
   - Verify Uniswap V4 addresses match Base mainnet docs

3. **Factory Address Prediction:**
   - Step 4 predicts Factory address
   - Step 5 MUST deploy Factory at exact predicted address
   - If mismatch, BootstrapETH will be orphaned!

4. **Ownership Transfer:**
   - IRREVERSIBLE - cannot be undone
   - Only run after COMPLETE testing
   - Verify SAFE multisig is ready

5. **SAFE Exemption:**
   - PERMANENT - cannot be removed
   - Applies to ALL tokens forever
   - Required for $CLAWS deployment

---

## 📞 EMERGENCY CONTACTS

If any step fails:
1. STOP immediately
2. DO NOT proceed to next step
3. Document the error
4. Check Basescan for transaction details
5. Verify .env variables are correct
6. Consult team before retrying

---

## ✅ POST-DEPLOYMENT CHECKLIST

After successful deployment:
- [ ] All contracts verified on Basescan
- [ ] CONFIG_ADDRESS saved
- [ ] HOOK_ADDRESS saved
- [ ] FACTORY_ADDRESS saved
- [ ] BOOTSTRAP_ETH_ADDRESS saved
- [ ] Test token launched successfully
- [ ] Swaps working correctly
- [ ] Fees distributed properly
- [ ] SAFE exemption verified
- [ ] Documentation updated
- [ ] Frontend updated with new addresses
- [ ] Ownership transferred to SAFE

---

## 🚀 READY TO DEPLOY?

Once YOU confirm the plan and provide the private key:
1. I will update all script files
2. I will add FACTORY_SALT to .env
3. I will execute Steps 1-8 in exact order
4. I will verify each step before proceeding
5. I will provide detailed status updates
6. I will STOP before Step 9 for manual testing

**DO NOT PROCEED UNTIL YOU CONFIRM THIS PLAN!**
