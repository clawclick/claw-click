# 🔐 Ownership Transfer Guide

Transfer ownership of all Clawclick ecosystem contracts to the multisig SAFE.

## 🎯 New Owner (SAFE)
```
0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
```

## 📋 Contracts to Transfer

### Ownable Contracts (7 total):

1. **Config** - `0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7`
   - Protocol configuration (fees, treasury, factory)
   - Controls system-wide parameters

2. **Hook** - `0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8`
   - Deep Sea Engine hook (tax/limits/graduation)
   - Core trading logic

3. **Factory** - `0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a`
   - Token launcher (creates new pools)
   - Manages liquidity positions

4. **BootstrapETH** - `0xE2649737D3005c511a27DF6388871a12bE0a2d30`
   - Provides bootstrap ETH for new launches
   - Manages free launch credits

5. **BirthCert** - `0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B`
   - Launch metadata & fee splits
   - Records creator info

6. **MemoryStorage** - `0x81ae37d31C488094bf292ebEb15C6eCfcD9Fad7D`
   - On-chain memory/knowledge base
   - Stores agent context

7. **LaunchBundler** - `0x1AF3b3Cd703Ff59D18A295f669Ad9B7051707268`
   - Bundles multi-step launch operations
   - Simplifies deployment UX

### Non-Ownable Contracts (no transfer needed):

8. **PoolSwapTest** - `0xBbB04538530970f3409e3844bF99475b5324912e`
   - Swap testing/routing utility
   - **NOT OWNABLE** - no ownership transfer needed
   - This is what "Production Claw" refers to

## 🚀 Run Transfer Script

### Option 1: Automated (Recommended)
```bash
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\contracts

forge script script/transferownership.s.sol:TransferOwnership \
  --rpc-url $ALCHEMY_API_BASE \
  --private-key $MAINNET_DEPLOYER_PK \
  --broadcast \
  --verify
```

### Option 2: Dry Run First (Check Before Broadcasting)
```bash
forge script script/transferownership.s.sol:TransferOwnership \
  --rpc-url $ALCHEMY_API_BASE \
  --private-key $MAINNET_DEPLOYER_PK
```

## ✅ What the Script Does

1. **Verifies Network**: Confirms you're on Base Mainnet (8453)
2. **Checks Ownership**: Shows current owner of each contract
3. **Transfers Ownership**: Calls `transferOwnership(NEW_OWNER)` on all 7 contracts
4. **Verifies Success**: Confirms new owner is the SAFE

## 🔍 Manual Verification (After Transfer)

Check on BaseScan:
```
https://basescan.org/address/<CONTRACT_ADDRESS>#readContract

Look for: owner() → should return 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
```

## ⚠️ Important Notes

- **ONE-WAY OPERATION**: Once ownership is transferred, you CANNOT reverse it
- **SAFE must accept**: Depending on SAFE setup, may need multisig approval
- **Gas fees**: ~0.01 ETH should be enough for all 7 transfers
- **No rush**: Script handles errors gracefully, can retry failed transfers

## 🛡️ Security Checklist

- [ ] Verified SAFE address checksum: `0xFf7549B06E68186C91a6737bc0f0CDE1245e349b`
- [ ] Confirmed network: Base Mainnet (8453)
- [ ] Deployer wallet has ETH for gas
- [ ] Backed up private key (in case need to retry)
- [ ] All 7 contracts deployed and verified

## 📊 Expected Output

```
================================================================
  CLAWCLICK OWNERSHIP TRANSFER
  Base Mainnet -> Multisig SAFE
================================================================

New Owner (SAFE): 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b

Network: Base Mainnet (Chain ID: 8453)
Deployer: 0x958fC4d5688F7e7425EEa770F54d5126a46A9104
Balance: 0.5 ETH

================================================================
  CHECKING CURRENT OWNERSHIP
================================================================

Config : 0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7
  Current Owner: 0x958fC4d5688F7e7425EEa770F54d5126a46A9104
  Status: YOU ARE OWNER (will transfer)

[... continues for all 7 contracts ...]

================================================================
  TRANSFERRING OWNERSHIP
================================================================

Config: Transferring...
Config: SUCCESS
[... continues for all 7 contracts ...]

================================================================
  VERIFYING NEW OWNERSHIP
================================================================

Config : 0x18b89e491d8f12d2be6D2A8e945dF4D93F1247a7
  Owner: 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
  Status: VERIFIED (owned by SAFE)

[... continues for all 7 contracts ...]

================================================================
  OWNERSHIP TRANSFER COMPLETE!
  All contracts now owned by SAFE: 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
================================================================
```

## 🎉 After Transfer

Once complete:
1. **SAFE has full control** of all protocol parameters
2. **Deployer wallet becomes powerless** (can no longer modify contracts)
3. **Protocol is decentralized** (multisig governance)
4. **Update documentation** to reflect new owner

## 🆘 Troubleshooting

**"Invalid parameters" error:**
- Ensure address uses checksummed format (capital letters)
- Script handles this automatically

**"Not owner" error:**
- Contract already transferred, or you're not the current owner
- Check current owner: `cast call <CONTRACT> "owner()(address)" --rpc-url $ALCHEMY_API_BASE`

**"Insufficient gas" error:**
- Add more ETH to deployer wallet
- Need ~0.0015 ETH per transfer × 7 = ~0.01 ETH total

**Transaction reverted:**
- Check contract is actually Ownable
- Verify network is correct (Base Mainnet)
- Try transferring contracts one at a time manually
