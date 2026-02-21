# Claw.click Sepolia Deployment

**Deployed:** February 21, 2026 12:53 PM GMT  
**Chain ID:** 11155111 (Sepolia)  
**Deployer:** 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7

---

## 📝 Core Contract Addresses

| Contract | Address | Transaction |
|----------|---------|-------------|
| **ClawclickConfig** | `0x6049BCa2F8780fA7A929EBB8a9571C2D94bf5ee1` | [0x292ac3d...1a9029](https://sepolia.etherscan.io/tx/0x292ac3d44fa5fcbcd49fce28967e43583ff895f015433c7b96511ee0fe1a9029) |
| **ClawclickHook** (V4) | `0xa2FF089271e4527025Ee614EB165368875A12AC8` | [0xe232c6e...b7961a](https://sepolia.etherscan.io/tx/0xe232c6e94e06eaa174456a5958dc4c37f761b2dd278e166261078d3fa6b7961a) |
| **ClawclickFactory** | `0x5C92E6f1Add9a2113C6977DfF15699e948e017Db` | [0xbb4101d...333234](https://sepolia.etherscan.io/tx/0xbb4101d5f058d83ab4e641c4409a8ce6486232084c3f9b3a8ff12e62b8333234) |
| **TestSwapRouter** | `0x501A262141E1b0C6103A760c70709B7631169d63` | [0x4c9ceca...a0c69b](https://sepolia.etherscan.io/tx/0x4c9ceca39fd8667cc3e9bc890fc01380ba465eb2a75e7269a14e3f4d13a0c69b) |

---

## 🎯 Test Token Launch

| Property | Value |
|----------|-------|
| **Token Name** | GradTestRepos |
| **Token Symbol** | GRADR |
| **Token Address** | `0x0d79931ec9CdDF474F24D9dE59E1169B38923E54` |
| **Pool ID** | `0x59dfc2f272eb7eaec85e72b46898cd0f0e0383327cbad4fe94db9f12301c69fa` |
| **Target MCAP** | 1 ETH |
| **Bootstrap Liquidity** | 0.001 ETH |

---

## 🔧 External References (Uniswap V4)

| Contract | Address |
|----------|---------|
| **Pool Manager** | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` |
| **Position Manager** | `0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4` |

---

## 📊 Deployment Summary

1. ✅ Config contract deployed and initialized
2. ✅ Hook contract deployed via CREATE2 (mined address)
3. ✅ Factory contract deployed with all dependencies
4. ✅ Factory address set in Config
5. ✅ Test router deployed for swap testing
6. ✅ Test token (GRADR) launched successfully

**Estimated Gas Used:** 16,730,473  
**Estimated Gas Cost:** ~0.000637 ETH

---

## 🔒 Security Features Implemented

- ✅ 5-wallet tax split functionality
- ✅ Position-based liquidity management (P1-P5)
- ✅ Epoch-based tax decay system
- ✅ Multi-position graduation logic
- ✅ Anti-bot protection for Phase 1
- ✅ Creator first-buy window (1 minute, 15% supply limit)

---

## 🧪 Next Steps

1. **Site Integration**: Update claw.click frontend with these addresses
2. **ABI Hookup**: Connect contract ABIs for event listening
3. **Stats Dashboard**: Link volume, tokens launched, trending data
4. **Agent Documentation**: Update programmatic deployment guides

---

## 🔗 Quick Links

- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Factory Contract**: https://sepolia.etherscan.io/address/0x5C92E6f1Add9a2113C6977DfF15699e948e017Db
- **Hook Contract**: https://sepolia.etherscan.io/address/0xa2FF089271e4527025Ee614EB165368875A12AC8
- **Test Token**: https://sepolia.etherscan.io/address/0x0d79931ec9CdDF474F24D9dE59E1169B38923E54
