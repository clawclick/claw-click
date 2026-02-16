# CLAWCLICK V4 - MAINNET DEPLOYMENT GUIDE

## PREREQUISITES

### Environment Setup

```bash
# Required environment variables
export PRIVATE_KEY="0x..."                      # Deployer private key
export MAINNET_RPC_URL="https://..."           # Mainnet RPC endpoint
export ETHERSCAN_API_KEY="..."                 # For verification
export TREASURY_ADDRESS="0x..."                # Treasury wallet
export OWNER_ADDRESS="0x..."                   # Owner wallet
```

### Dependencies

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install

# Build contracts
forge build
```

---

## DEPLOYMENT SEQUENCE

### STEP 1: Deploy Config

```bash
forge script script/01_Deployment.t.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

**Expected Output:**
```
=== CORE DEPLOYED ===
Config: 0x...
```

**Save:** `CONFIG_ADDRESS`

**Verify:**
```bash
cast call $CONFIG_ADDRESS "owner()(address)"
cast call $CONFIG_ADDRESS "treasury()(address)"
```

---

### STEP 2: Mine Valid Hook Salt

**Important:** This step MUST be run OFF-CHAIN first!

```bash
# Set environment
export CONFIG=$CONFIG_ADDRESS
export DEPLOYER=$OWNER_ADDRESS

# Run hook miner (view-only)
forge script script/02_MineHook.s.sol \
  --rpc-url $MAINNET_RPC_URL
```

**Expected Output:**
```
=== HOOK SALT FOUND ===
Predicted Address: 0x...
Salt: 0x...
```

**Critical:** The predicted address MUST have these bits set:
- Bit 159: beforeInitialize
- Bit 157: beforeAddLiquidity
- Bit 155: beforeRemoveLiquidity
- Bit 153: beforeSwap
- Bit 152: afterSwap
- Bit 149: beforeSwapReturnDelta

**Verify Address:**
```bash
# Convert predicted address to binary and check required bits
python3 << EOF
address = 0x...  # Your predicted address
bits = bin(address)[2:].zfill(160)
required = {159, 157, 155, 153, 152, 149}
for bit in required:
    if bits[-(bit+1)] != '1':
        print(f"ERROR: Bit {bit} not set!")
    else:
        print(f"OK: Bit {bit} set")
EOF
```

**Save:** 
- `HOOK_ADDRESS` (predicted)
- `HOOK_SALT`

---

### STEP 3: Deploy Hook

```bash
# Set environment
export CONFIG=$CONFIG_ADDRESS
export HOOK_SALT="0x..."  # From step 2

forge script script/03_DeployHook.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

**Expected Output:**
```
=== HOOK DEPLOYED ===
Hook: 0x...
Verification: PASSED
```

**Verify Address Matches:**
```bash
if [ "$HOOK_ADDRESS" != "$(deployed_address)" ]; then
    echo "ERROR: Hook address mismatch!"
    exit 1
fi
```

**Verify Permissions:**
```bash
cast call $HOOK_ADDRESS "getHookPermissions()(tuple)"
```

**Expected:** All required permissions = true

---

### STEP 4: Deploy Locker + Factory

```bash
# Set environment
export CONFIG=$CONFIG_ADDRESS
export HOOK=$HOOK_ADDRESS

forge script script/04_DeployLockerAndFactory.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

**Expected Output:**
```
=== LOCKER + FACTORY DEPLOYED ===
Locker: 0x...
Factory: 0x...
```

**Save:**
- `LOCKER_ADDRESS`
- `FACTORY_ADDRESS`

**Verify Integration:**
```bash
# Hook should point to locker
cast call $HOOK "lpLocker()(address)"
# Expected: $LOCKER_ADDRESS

# Locker should point to hook
cast call $LOCKER "hook()(address)"
# Expected: $HOOK

# Config should point to factory
cast call $CONFIG "factory()(address)"
# Expected: $FACTORY_ADDRESS
```

---

## POST-DEPLOYMENT VALIDATION

### Test Launch Creation

```bash
# Fund test account
cast send $DEPLOYER --value 0.01ether --private-key $PRIVATE_KEY

# Create test launch
forge script script/05_CreateLaunch.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

**Expected Output:**
```
=== TOKEN CREATED ===
Token: 0x...
Pool initialized: true
Hook: 0x...
```

**Save:** `TEST_TOKEN`

**Verify Launch:**
```bash
# Get launch info
cast call $FACTORY "getLaunchByToken(address)(tuple)" $TEST_TOKEN

# Expected fields:
# - token: $TEST_TOKEN
# - beneficiary: (your address)
# - creator: $DEPLOYER
# - targetMcapETH: 1000000000000000000 (1 ETH)
```

---

### Execute Lifecycle Test

```bash
export TOKEN=$TEST_TOKEN
export FACTORY=$FACTORY_ADDRESS

forge script script/06_LiveLifecycleTest.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

**Expected Flow:**

1. **Phase 1: Buy**
   ```
   ========== PHASE 1 BUY ==========
   Epoch: 0
   Tax BPS: 4000
   Graduated: false
   ```

2. **Phase 2: Pump**
   ```
   ========== PUMP ==========
   Epoch: 1 or 2 (depending on price impact)
   Tax BPS: 2000 or 1000
   Graduated: false
   ```

3. **Phase 3: Graduate**
   ```
   ========== FORCE GRADUATION ==========
   Epoch: 4
   Tax BPS: 100
   Graduated: true
   ```

4. **Phase 4: Sell**
   ```
   ========== SELL ==========
   (Post-graduation trading)
   ```

**Validation Checks:**

```bash
# Get pool ID
POOL_ID=$(cast call $HOOK "tokenToPoolId(address)(bytes32)" $TOKEN)

# Check graduation
cast call $HOOK "isGraduated(bytes32)(bool)" $POOL_ID
# Expected: true

# Check liquidity stage
cast call $HOOK "launches(bytes32)(tuple)" $POOL_ID
# Expected: liquidityStage >= 1

# Check graduation MCAP set
# Expected: graduationMcap > 0
```

---

## VERIFICATION CHECKLIST

### Smart Contract Verification

- [ ] Config verified on Etherscan
- [ ] Hook verified on Etherscan
- [ ] Locker verified on Etherscan
- [ ] Factory verified on Etherscan
- [ ] Test token verified on Etherscan

```bash
# Verify each contract
forge verify-contract $CONTRACT_ADDRESS ContractName \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --chain-id 1
```

### Functional Verification

- [ ] Config ownership correct
- [ ] Hook permissions validated
- [ ] Hook <-> Locker linked
- [ ] Factory <-> Config linked
- [ ] Test launch created successfully
- [ ] Initial buy executed
- [ ] Epoch progression working
- [ ] Graduation triggered at 16x
- [ ] Post-graduation trading working

### Security Verification

- [ ] Owner keys secure
- [ ] Treasury address correct
- [ ] No backdoors in contracts
- [ ] Access control working
- [ ] Reentrancy protection active
- [ ] Integer overflow protection (0.8+)

---

## MONITORING SETUP

### Events to Monitor

```solidity
// Factory
event LaunchCreated(address indexed token, address indexed creator);

// Hook
event Initialized(PoolId indexed poolId, address indexed token);
event Graduated(PoolId indexed poolId);
event LiquidityStageUpdated(PoolId indexed poolId, uint8 newStage);

// Locker
event PositionLocked(uint256 indexed tokenId, PoolId indexed poolId);
event RebalanceExecuted(PoolId indexed poolId, uint8 stage);
```

### Monitoring Script

```bash
# Listen for launches
cast logs \
  --address $FACTORY \
  --event "LaunchCreated(address,address)" \
  --rpc-url $MAINNET_RPC_URL

# Listen for graduations
cast logs \
  --address $HOOK \
  --event "Graduated(bytes32)" \
  --rpc-url $MAINNET_RPC_URL
```

---

## TROUBLESHOOTING

### Hook Address Invalid

**Error:** `HookAddressNotValid(0x...)`

**Cause:** Hook address doesn't have required permission bits set

**Solution:**
1. Re-run `HookMiner` with increased search space
2. Verify deployer address matches
3. Verify creation code matches (no changes since mining)

### Launch Creation Fails

**Error:** Various initialization errors

**Possible Causes:**
- Factory not set in Config
- Hook not linked to Locker
- Insufficient ETH sent
- Invalid parameters

**Debug:**
```bash
# Check factory set
cast call $CONFIG "factory()(address)"

# Check hook locker
cast call $HOOK "lpLocker()(address)"

# Check parameters
cast call $FACTORY "createLaunch((string,string,address,address,bool,uint256))" \
  --value 0.0003ether \
  "Test" "TST" $BENEFICIARY $AGENT false 1000000000000000000
```

### Swap Reverts

**Error:** Swap transaction reverts

**Possible Causes:**
- Pool not initialized
- Insufficient liquidity
- Slippage too high
- Limits exceeded (protected phase)

**Debug:**
```bash
# Check pool initialized
cast call $HOOK "launches(bytes32)(tuple)" $POOL_ID

# Check current phase
cast call $HOOK "isGraduated(bytes32)(bool)" $POOL_ID

# Check current tax
cast call $HOOK "getCurrentTax(bytes32)(uint256)" $POOL_ID
```

---

## EMERGENCY PROCEDURES

### Pause System (If Needed)

**Note:** Current contracts don't have pause functionality. If needed for V2:

```solidity
// Add to Config
bool public paused;
modifier whenNotPaused() {
    require(!paused, "Paused");
    _;
}
```

### Upgrade Path

Current contracts are **NOT** upgradeable. Any changes require:

1. Deploy new contracts
2. Migrate liquidity (if applicable)
3. Update frontend/integration

**Future:** Consider using UUPS proxy pattern for upgradeability

---

## SUCCESS CRITERIA

### Deployment Success

✅ All contracts deployed  
✅ All contracts verified  
✅ All integrations working  
✅ Test launch created  
✅ Test lifecycle completed

### Operational Success

✅ Real launches can be created  
✅ Swaps execute correctly  
✅ Epochs progress as expected  
✅ Graduation triggers at 16x  
✅ Post-graduation trading works  
✅ Fees distributed correctly

### Monitoring Active

✅ Event listeners running  
✅ Alerts configured  
✅ Dashboard monitoring  
✅ Gas usage tracking

---

## NEXT STEPS

1. **Frontend Integration**
   - Update contract addresses
   - Test all user flows
   - Deploy to production

2. **Documentation**
   - User guide
   - API documentation
   - Integration guide

3. **Marketing**
   - Announcement
   - Launch partners
   - Initial campaigns

---

## CONTACT & SUPPORT

**Repository:** https://github.com/clawclick/claw-click  
**Docs:** https://docs.claw.click  
**Discord:** https://discord.gg/clawclick

---

**Deployment Checklist Completed:** [ ]  
**Verified By:** _______________  
**Date:** _______________  
**Network:** Ethereum Mainnet  
**Chain ID:** 1

