# 🚀 Claw.click Mainnet Deployment Guide

## 📁 Repository Structure

The deployment, wiring, and testing infrastructure has been organized into **3 clean folders**:

```
contracts/
├── mainnet-deploy/     # Step-by-step deployment scripts (5 steps)
├── mainnet-wire/       # Post-deployment configuration (4 steps)
├── mainnet-tests/      # Comprehensive test suite (8 categories)
└── MAINNET_DEPLOYMENT_GUIDE.md  # This file
```

---

## 🎯 Quick Start

### 1️⃣ **Deploy** (5 scripts)
```bash
cd mainnet-deploy/
# Follow README.md step by step
```

**What gets deployed:**
- ClawclickConfig
- ClawclickHook_V4 (with mined address)
- BootstrapETH
- ClawclickFactory

**Time:** ~10 minutes + verification

---

### 2️⃣ **Wire** (4 scripts)
```bash
cd mainnet-wire/
# Follow README.md step by step
```

**What gets configured:**
- Factory wired to Config
- SAFE exemption set
- BootstrapETH funded (optional)
- Ownership transferred to SAFE

**Time:** ~5 minutes

---

### 3️⃣ **Test** (before mainnet!)
```bash
cd mainnet-tests/
# Run on Base Sepolia first!
forge test --match-path "mainnet-tests/*.t.sol" --rpc-url $BASE_SEPOLIA_RPC_URL -vvv
```

**What gets tested:**
- Full deployment verification
- Token launches
- Trading (Phase 1 & 2)
- Fee collection
- SAFE exemption
- Edge cases

**Time:** ~5 minutes

---

## 📋 Complete Deployment Flow

### Prerequisites
```bash
# Environment variables
export BASE_MAINNET_RPC_URL="https://mainnet.base.org"
export DEPLOYER_PRIVATE_KEY="0x..."
export SAFE_ADDRESS="0xFf7549B06E68186C91a6737bc0f0CDE1245e349b"
export POOL_MANAGER_ADDRESS="0x..." # Base mainnet Uniswap V4
export POSITION_MANAGER_ADDRESS="0x..." # Base mainnet Uniswap V4
```

### Step-by-Step

#### 📦 Deployment Phase
1. `01_DeployConfig.s.sol` → Deploy Config
2. `02_MineHook.s.sol` → Mine hook address salt
3. `03_DeployHook.s.sol` → Deploy Hook with salt
4. `04_DeployBootstrapETH.s.sol` → Deploy Bootstrap funding
5. `05_DeployFactory.s.sol` → Deploy Factory

**Output:** All core contracts deployed and verified

#### 🔌 Wiring Phase
1. `01_WireFactory.s.sol` → Connect Factory to Config
2. `02_SetSafeExemption.s.sol` → Exempt SAFE from taxes/limits
3. `03_FundBootstrapETH.s.sol` → Fund free launches (optional)
4. `04_TransferOwnership.s.sol` → Transfer to SAFE (FINAL STEP)

**Output:** Fully configured and decentralized ecosystem

#### 🧪 Testing Phase
Run comprehensive tests on Base Sepolia:
- Deployment verification
- Token launches
- Trading mechanics
- Fee collection
- SAFE exemption
- Edge cases

**Output:** Confidence that everything works

---

## 🔒 Security Features

### Implemented Safeguards
✅ **SAFE Treasury Global Exemption**
- SAFE wallet permanently exempt from ALL taxes and limits
- Can hold any amount of any token
- Needed for $CLAWS deployment (15% transfer)

✅ **Automatic Token→ETH Swap**
- LP fees automatically converted to ETH
- Treasury receives ETH only (no manual swaps)
- Eliminates 100+ daily manual operations

✅ **70/30 Fee Split**
- Phase 1: Hook taxes split 70% creator / 30% platform
- Phase 2+: LP fees split 70% creator / 30% platform
- Fee split wallets supported (1-5 wallets per token)

✅ **Multi-Position Liquidity System**
- 5 positions (P1-P5) for capital efficiency
- Automatic graduation at 16x MCAP
- Tiered tax decay through 4 epochs

✅ **Ownership Transfer to SAFE**
- Deployer has temporary control
- Final step transfers everything to SAFE multisig
- Fully decentralized governance

---

## ⚠️ Critical Notes

### Before Mainnet Deployment
1. ✅ **Test on Base Sepolia first** - Run ALL tests
2. ✅ **Verify all addresses** - Double-check Uniswap V4 addresses
3. ✅ **Check SAFE address** - Must be correct (0xFf7549...349b)
4. ✅ **Verify contracts** - All contracts on Basescan
5. ✅ **Review gas costs** - Ensure reasonable

### During Deployment
1. ⚠️ **Save all addresses** - You'll need them for wiring
2. ⚠️ **Verify each step** - Check Basescan after each deployment
3. ⚠️ **Don't skip steps** - Follow exact order
4. ⚠️ **Use --legacy flag** - For deterministic gas pricing
5. ⚠️ **Keep private keys safe** - Deployer has temporary admin access

### After Deployment
1. ✅ **Complete wiring** - All 4 wiring steps
2. ✅ **Test on mainnet** - Launch 1 test token first
3. ✅ **Verify fees** - Check fee collection works
4. ✅ **Transfer ownership** - Final step to SAFE
5. ✅ **Celebrate** - Ecosystem is live! 🎉

---

## 📊 Contract Addresses (Base Mainnet)

After deployment, document here:

```
ClawclickConfig: 0x...
ClawclickHook: 0x...
BootstrapETH: 0x...
ClawclickFactory: 0x...

Uniswap V4 PoolManager: 0x...
Uniswap V4 PositionManager: 0x...
SAFE Treasury: 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
```

---

## 🆘 Troubleshooting

### Common Issues

**"Hook deployment fails"**
- Check mined salt is correct
- Verify CREATE2 deployer address
- Ensure permission bits match

**"Factory deployment fails"**
- Verify BootstrapETH deployed first
- Check all dependency addresses
- Ensure predicted address matches

**"Tests fail on Sepolia"**
- Get testnet ETH from faucet
- Verify deployment completed
- Check contract addresses in .env

**"Ownership transfer fails"**
- Must be called by current owner
- Verify SAFE address is correct
- Complete wiring steps first

---

## 📞 Support

For issues:
1. Check README.md in each folder
2. Review troubleshooting sections
3. Verify environment variables
4. Test on Sepolia first

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All environment variables set
- [ ] Base mainnet RPC working
- [ ] Deployer wallet has ETH
- [ ] SAFE address verified
- [ ] Uniswap V4 addresses confirmed

### Deployment
- [ ] Config deployed
- [ ] Hook mined and deployed
- [ ] BootstrapETH deployed
- [ ] Factory deployed
- [ ] All contracts verified on Basescan

### Wiring
- [ ] Factory wired to Config
- [ ] SAFE exemption set
- [ ] BootstrapETH funded (optional)
- [ ] Ownership transferred to SAFE

### Testing
- [ ] All Sepolia tests pass
- [ ] Mainnet test token launched
- [ ] Test swaps executed
- [ ] Fee collection verified
- [ ] SAFE exemption tested

### Launch
- [ ] System fully operational
- [ ] Documentation updated
- [ ] Team notified
- [ ] 🚀 **CLAW.CLICK IS LIVE!**

---

## 📈 What's Next

After successful mainnet deployment:

1. **Deploy $CLAWS** - Ecosystem token
2. **Test Thoroughly** - Multiple tokens, various scenarios
3. **Monitor Fees** - Verify collection working
4. **Fund Bootstrap** - Enable free launches
5. **Go Live** - Open to public

---

**Built with ❤️ by the Claw.click team**

For latest updates: https://github.com/clawclick/claw-click
