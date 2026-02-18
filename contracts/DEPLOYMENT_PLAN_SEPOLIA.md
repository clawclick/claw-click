# Sepolia Deployment Plan

## Pre-Deployment Checklist
- [x] All contracts compiled successfully
- [x] Bug fixes applied (graduation timing, token allocations, extended BPS)
- [x] Test suite validated (140 tests)
- [ ] Full test suite passing (in progress)
- [x] Code pushed to GitHub (commit 75be202)

## Sepolia Network Details
- **Chain ID**: 11155111
- **RPC**: https://ethereum-sepolia-rpc.publicnode.com
- **Explorer**: https://sepolia.etherscan.io
- **Testnet ETH**: Get from https://www.alchemy.com/faucets/ethereum-sepolia

## Required Addresses (Sepolia)
- **PoolManager**: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- **PositionManager**: `0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4`
- **Treasury**: TBD (deployment wallet or multisig)
- **Owner**: TBD (deployment wallet)

## Deployment Sequence

### Step 1: Deploy ClawclickConfig
```bash
forge create src/core/ClawclickConfig.sol:ClawclickConfig \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args $TREASURY_ADDRESS $OWNER_ADDRESS \
  --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

**Constructor args:**
- `treasury`: Platform treasury address
- `owner`: Initial owner address

### Step 2: Deploy ClawclickHook_V4
```bash
forge create src/core/ClawclickHook_V4.sol:ClawclickHook \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543 $CONFIG_ADDRESS \
  --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

**Constructor args:**
- `poolManager`: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- `config`: Address from Step 1

### Step 3: Deploy ClawclickFactory
```bash
forge create src/core/ClawclickFactory.sol:ClawclickFactory \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --constructor-args \
    $CONFIG_ADDRESS \
    0xE03A1074c86CFeDd5C142C4F04F1a1536e203543 \
    $HOOK_ADDRESS \
    0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4 \
  --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

**Constructor args:**
- `config`: Address from Step 1
- `poolManager`: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- `hook`: Address from Step 2
- `positionManager`: `0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4`

### Step 4: Configure Contracts
```bash
# Set factory in config (allows factory to create launches)
cast send $CONFIG_ADDRESS \
  "setFactory(address)" $FACTORY_ADDRESS \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

## Test Launch Parameters

### Launch #1: Minimum Bootstrap (2k MCAP)
```solidity
LaunchInfo memory info = LaunchInfo({
    token: <deployed token>,
    beneficiary: <beneficiary address>,
    agentWallet: <agent address>,
    creator: msg.sender,
    name: "Test Token Alpha",
    symbol: "TTA",
    poolId: <calculated>,
    poolKey: <constructed>,
    startingMCAP: 0.001 ether,  // 2k MCAP ($2 @ $2000/ETH)
    totalSupply: 1_000_000_000 * 1e18
});
```

**Expected behavior:**
- P1: 0.001 ETH (2k → 32k MCAP)
- P2 mints at epoch 2: 0.016 ETH (32k → 512k MCAP)
- P3 mints at epoch 2 of P2: 0.256 ETH (512k → 8M MCAP)
- P4 mints at epoch 2 of P3: 4.096 ETH (8M → 128M MCAP)
- P5 mints at epoch 2 of P4: 65.536 ETH (128M+ MCAP)
- Graduation: P1 epoch 4 end (32 ether total volume = 16x starting MCAP)

### Launch #2: High Bootstrap (10 ETH = 20k MCAP)
```solidity
startingMCAP: 10 ether  // 20k MCAP
```

**Expected behavior:**
- P1: 10 ETH (20k → 320k MCAP)
- P2: 160 ETH (320k → 5.12M MCAP)
- P3: 2,560 ETH (5.12M → 81.92M MCAP)
- P4: 40,960 ETH (81.92M → 1.31B MCAP)
- P5: 655,360 ETH (1.31B+ MCAP)
- Graduation: P1 epoch 4 end (320 ether volume)

## Post-Deployment Testing

### Test Sequence
1. **Bootstrap Test**: Create launch with 0.001 ETH
2. **P1 Trading**: Execute swaps, verify epochs advance
3. **P2 Minting**: Trigger lazy mint at P1 epoch 2
4. **Capital Recycling**: Verify P1 retirement when P3 mints
5. **Graduation**: Trade until P1 epoch 4 completes, verify graduation
6. **Post-Graduation**: Verify transfers to graduated V4 pool

### Key Metrics to Monitor
- Token allocation distribution (P1-P5)
- Epoch advancement timing
- Position minting (lazy minting at epoch 2)
- Position retirement (2 steps back)
- Capital recycling (retired position ETH → new positions)
- Graduation timing (P1 epoch 4 end, BEFORE epoch++)
- Tax decay (50% → 10% over P1 epochs)
- Fee collection (70% beneficiary / 30% platform)

## Deployment Scripts

Create deployment scripts in `script/`:
- `DeployConfig.s.sol` - Deploy config contract
- `DeployHook.s.sol` - Deploy hook (requires config address)
- `DeployFactory.s.sol` - Deploy factory (requires config + hook)
- `ConfigureContracts.s.sol` - Set factory in config
- `CreateTestLaunch.s.sol` - Create test launch

## Emergency Procedures

### Pause System
```bash
cast send $CONFIG_ADDRESS \
  "setPaused(bool)" true \
  --rpc-url $SEPOLIA_RPC \
  --private-key $OWNER_KEY
```

### Update Platform Share
```bash
cast send $CONFIG_ADDRESS \
  "setPlatformShareBps(uint256)" 2000 \  # 20%
  --rpc-url $SEPOLIA_RPC \
  --private-key $OWNER_KEY
```

### Change Owner
```bash
cast send $CONFIG_ADDRESS \
  "transferOwnership(address)" $NEW_OWNER \
  --rpc-url $SEPOLIA_RPC \
  --private-key $OWNER_KEY
```

## Success Criteria
- [ ] All 3 contracts deployed and verified on Sepolia
- [ ] Factory set in config
- [ ] Test launch created successfully
- [ ] P1 trading works (epochs advance)
- [ ] P2 mints at P1 epoch 2
- [ ] P1 retires when P3 mints
- [ ] Graduation triggers at P1 epoch 4 end
- [ ] Post-graduation trading works in V4 pool

## Next Steps After Sepolia
1. Document any issues found
2. Run extended test scenarios
3. Gas optimization if needed
4. Security audit (if budget allows)
5. Prepare mainnet deployment
6. Launch marketing campaign
