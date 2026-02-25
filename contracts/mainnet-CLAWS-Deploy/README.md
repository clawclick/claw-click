# $CLAWS Token Launch & Distribution Scripts

Complete workflow for launching CLAWS token with 3-way fee split + mass distribution testing on Ethereum Sepolia.

## 🎯 Launch Dynamics Summary

**Network**: Ethereum Sepolia (Chain ID: 11155111)  
**Starting LP**: 3 ETH  
**Starting MC**: $6,000  
**ETH Price**: $1,827

### Phase 1: Dev Override (15% net tax)
- **Wallets**: 1 (setup wallet)
- **ETH Required**: 0.75 ETH
- **USD Cost**: $1,370.25
- **Supply Gained**: 15%
- **MC After**: ~$9,375

### Phase 2: Push $9,375 → $12,000 (40% tax, 0.3% maxTx)
- **Wallets**: 24
- **Total ETH**: 0.49 ETH
- **ETH Per Wallet**: 0.0204 ETH
- **USD Per Wallet**: ~$37.30
- **Gross Bought**: ~7%
- **Net Gained**: 4.2%
- **MC After**: ~$12,000

### Phase 3: Above $12k (20% tax, 0.6% maxTx)
- **Wallets**: 5
- **Total ETH**: 0.26 ETH
- **ETH Per Wallet**: 0.052 ETH
- **USD Per Wallet**: ~$95.00
- **Gross Bought**: 3.0%
- **Net Gained**: 2.4%
- **MC After**: ~$13,500

### FINAL TOTALS
- **Total Wallets**: 30 (1 setup + 29 generated)
- **Total ETH**: ~1.50 ETH
- **Total USD**: ~$2,740.50
- **Total Supply**: ~21.6% (15% Safe + 6.6% distributed)
- **Final MC**: ~$13,500

---

## 📁 Files

```
mainnet-CLAWS-Deploy/
├── 01_LaunchTest.s.sol           # Launch + dev buy + transfer to Safe
├── 02_GenerateFundWallets.s.sol  # Generate 29 wallets + fund
├── 03_BuyAndForward.s.sol         # Sequential buys + forward to cold storage
├── SwapHelper.sol                 # Uniswap V4 swap helper (unlock callback)
├── cold-storage-addresses.json    # 24 MM addresses (+ 5 MORE NEEDED)
└── README.md                      # This file
```

---

## 🔧 Prerequisites

### 1. Contracts Deployed
- ✅ Factory: `0xAB936490488A16e134c531c30B6866D009a8dF2e`
- ✅ Hook: `0x3C26aE16F7C62856F372cF152e2f252ab61Deac8`
- ✅ Config: `0xb777a04B92bF079b9b3804f780905526cB1458c1`
- ✅ PoolManager (V4): `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`

### 2. Safe Exemption Active
```bash
cast call 0x3C26aE16F7C62856F372cF152e2f252ab61Deac8 \
  "globalExemptWallets(address)" \
  0xFf7549B06E68186C91a6737bc0f0CDE1245e349b \
  --rpc-url sepolia
# Should return: true
```

### 3. Setup Wallet Funded
```bash
cast balance 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7 --rpc-url sepolia
# Need: ~2 ETH (0.75 dev buy + 1.04 for 29 wallets + gas)
```

### 4. Environment Variables
```bash
export TESTING_DEV_WALLET_PK=0x0075f14030668b47b7f9d8b7a7fe173a96071129c9f0638aec02e74d4bcda65a
```

---

## 🚀 Execution Guide

### Script 1: Launch & Dev Buy

**Purpose**: Launch CLAWS token, set fee split, execute dev override buy, transfer to Safe

```bash
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\contracts

forge script mainnet-CLAWS-Deploy/01_LaunchTest.s.sol:LaunchTest \
  --rpc-url sepolia \
  --broadcast \
  -vvv
```

**Output**: Token address (save for next steps)

**Expected Results**:
- ✅ CLAWS token deployed
- ✅ 3-way fee split configured (Safe 50%, Knightly 25%, Creator 25%)
- ✅ Dev override set to 15%
- ✅ 0.75 ETH buy executed
- ✅ ~15% supply transferred to Safe
- ✅ MC at ~$9,375

**Set token address for next scripts**:
```bash
export TEST_TOKEN_ADDRESS=0x... # From script output
```

---

### Script 2: Generate & Fund Wallets

**Purpose**: Generate 29 wallets + fund with appropriate amounts

```bash
forge script mainnet-CLAWS-Deploy/02_GenerateFundWallets.s.sol:GenerateFundWallets \
  --rpc-url sepolia \
  --broadcast \
  -vvv
```

**Output**: Console log with wallet data (addresses + private keys)

**Expected Results**:
- ✅ 24 wallets funded with 0.0304 ETH each (Phase 2)
- ✅ 5 wallets funded with 0.062 ETH each (Phase 3)
- ✅ Total distributed: ~1.04 ETH

**Note**: Wallet data is logged to console (no need to save separately for scripts)

---

### Script 3: Sequential Buys & Forward

**Purpose**: Execute 29 sequential buys + forward to cold storage

⚠️ **BEFORE RUNNING**: Add 5 Phase 3 cold storage addresses to `03_BuyAndForward.s.sol` (lines 63-67)

```bash
# Ensure TEST_TOKEN_ADDRESS is set
export TEST_TOKEN_ADDRESS=0x...

forge script mainnet-CLAWS-Deploy/03_BuyAndForward.s.sol:BuyAndForward \
  --rpc-url sepolia \
  --broadcast \
  -vvv
```

**Workflow**:
1. Deploy SwapHelper contract
2. **Phase 2** (Wallets 1-24):
   - Buy 0.0204 ETH per wallet
   - 3s delay between buys
   - Retry 2x on failure
   - Forward tokens to cold storage
3. **Phase 3** (Wallets 25-29):
   - Buy 0.052 ETH per wallet
   - Same retry + forward logic
4. Forward remaining ETH to cold storage

**Expected Results**:
- ✅ 29 buys executed (some may fail - script continues)
- ✅ Tokens forwarded to 29 cold storage wallets
- ✅ Remaining ETH forwarded to cold storage
- ✅ MC pushed to ~$13,500
- ✅ Total supply controlled: ~21.6%

---

## ⚙️ Key Addresses

### Roles
| Role | Address | Purpose |
|------|---------|---------|
| Setup Wallet | `0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7` | Deployer/buyer (Phase 1) |
| Safe Treasury | `0xFf7549B06E68186C91a6737bc0f0CDE1245e349b` | Receives 15% dev buy + 50% fees |
| Knightly | `0xB11592b5B690F41162176603726BB6c5a8904d03` | Receives 25% fees |
| Creator | `0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079` | Receives 25% fees |

### Cold Storage (Phase 2 - 24 wallets)
See `cold-storage-addresses.json` for full list.

### Cold Storage (Phase 3 - 5 wallets)
⚠️ **ACTION REQUIRED**: Provide 5 additional cold storage addresses and update line 63-67 in `03_BuyAndForward.s.sol`

---

## 🔍 Verification

After all scripts complete, verify:

### 1. Token Deployment
```bash
cast call $TEST_TOKEN_ADDRESS "name()" --rpc-url sepolia
cast call $TEST_TOKEN_ADDRESS "symbol()" --rpc-url sepolia
cast call $TEST_TOKEN_ADDRESS "totalSupply()" --rpc-url sepolia
```

### 2. Safe Balance (~15% supply)
```bash
cast call $TEST_TOKEN_ADDRESS \
  "balanceOf(address)" \
  0xFf7549B06E68186C91a6737bc0f0CDE1245e349b \
  --rpc-url sepolia
```

### 3. Cold Storage Balances
```bash
# Check first cold wallet
cast call $TEST_TOKEN_ADDRESS \
  "balanceOf(address)" \
  0x27E030789043ef2Cf70F458018c85019b6A23399 \
  --rpc-url sepolia
```

### 4. Fee Split Configuration
```bash
# Check Factory launch info
cast call 0xAB936490488A16e134c531c30B6866D009a8dF2e \
  "launchByToken(address)" \
  $TEST_TOKEN_ADDRESS \
  --rpc-url sepolia
```

---

## 🚨 Known Issues & Workarounds

### Issue 1: SwapHelper Settlement
**Status**: Implemented but UNTESTED

The `SwapHelper.sol` contract implements Uniswap V4's unlock callback pattern for swaps. However, V4 currency settlement is complex and may require adjustments.

**If swaps fail**:
1. Check SwapHelper deployment logs for errors
2. Verify PoolManager address is correct
3. Test with a single buy manually first
4. Consider using Uniswap's official SwapRouter if available

**Alternative**: Use external swap tool (Uniswap UI, cast commands) and only run token/ETH forwarding logic

### Issue 2: Phase 3 Cold Storage Addresses Missing
**Status**: 5 addresses needed (indices 24-28)

Script 3 will REVERT if Phase 3 cold storage addresses are not provided.

**Fix**: Update `03_BuyAndForward.sol` lines 63-67 with 5 valid addresses before running.

### Issue 3: Gas Estimation
**Status**: Buffer amounts may need adjustment

If transactions fail due to insufficient gas:
- Increase `GAS_RESERVE` in script 3 (currently 0.003 ETH)
- Increase funding amounts in script 2

---

## 📊 Expected Final State

| Entity | Expected Balance | Source |
|--------|-----------------|--------|
| Safe Treasury | ~150M CLAWS (15%) | Phase 1 dev buy |
| Cold Wallets 1-24 | Variable CLAWS | Phase 2 buys (0.0204 ETH each) |
| Cold Wallets 25-29 | Variable CLAWS | Phase 3 buys (0.052 ETH each) |
| All Cold Wallets | ~0.01-0.05 ETH | Remaining gas funds |
| Hook | 30% of LP fees | Collected during trades |
| Safe (fees) | 35% of total LP fees | 50% of 70% split |
| Knightly (fees) | 17.5% of total LP fees | 25% of 70% split |
| Creator (fees) | 17.5% of total LP fees | 25% of 70% split |

**Total Supply Controlled**: ~21.6%  
**Final Market Cap**: ~$13,500  
**ETH Spent**: ~1.50 ETH total

---

## 🧪 Post-Launch Testing

After successful execution:

1. **Claim LP Fees** (test fee distribution):
   ```bash
   cast send 0xAB936490488A16e134c531c30B6866D009a8dF2e \
     "collectFeesFromPosition(bytes32,uint256)" \
     <poolId> \
     0 \
     --rpc-url sepolia \
     --private-key $TESTING_DEV_WALLET_PK
   ```

2. **Verify Fee Split**:
   - Check Safe balance increased by 50% of fees
   - Check Knightly balance increased by 25% of fees
   - Check Creator balance increased by 25% of fees

3. **Test Tax Decay**:
   - Execute more buys to push MC higher
   - Verify tax rate decreases as MC grows

4. **Test Graduation** (if MC reaches threshold):
   - Trigger graduation
   - Verify LP positions migrate
   - Test post-grad trading

---

## ❓ Troubleshooting

### "Insufficient balance" Error
- Fund setup wallet with more Sepolia ETH
- Faucet: https://sepoliafaucet.com

### Swap Fails
- Check PoolManager address is correct
- Verify pool has liquidity
- Try reducing buy amount
- Check if maxTx limits are blocking

### "Cold storage address not provided"
- Add 5 Phase 3 addresses to script 3 (lines 63-67)

### Safe Exemption Not Working
- Re-run `mainnet-wire/02_SetSafeExemption.s.sol`
- Verify with `cast call` (see prerequisites)

### Script Times Out
- Increase `--timeout` flag in forge command
- Run phases separately if needed

---

## 📞 Next Steps

After successful launch:

1. ✅ Verify all cold storage balances
2. ✅ Test fee collection & distribution
3. ✅ Update frontend with CLAWS token
4. ✅ Monitor for any anomalies
5. ✅ Document actual vs expected results
6. ✅ Prepare for mainnet deployment (if successful)

---

**Status**: Scripts ready for execution  
**Last Updated**: 2026-02-24  
**Network**: Ethereum Sepolia  
**Estimated Gas Cost**: ~0.2-0.3 ETH (network dependent)
