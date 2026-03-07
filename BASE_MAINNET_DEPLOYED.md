# Base Mainnet Deployment - COMPLETE ✅

**Date:** March 7, 2026  
**Network:** Base (Chain ID: 8453)  
**Deployer:** 0x958fC4d5688F7e7425EEa770F54d5126a46A9104

---

## 🎉 Deployed Contracts

### ClawdNFT (Soul NFTid)
**Address:** `0x553016FA9Ead8ACFa1d96220901f1e91EEB135f4`  
**Basescan:** https://basescan.org/address/0x553016FA9Ead8ACFa1d96220901f1e91EEB135f4  
**Verified:** ✅ Yes  
**Block:** 43049421  
**Gas Used:** 2,123,253 gas * 0.00500015 gwei = 0.00001061658348795 ETH

**Constructor Args:**
- Birth Certificate: `0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B`
- Treasury (SAFE): `0xFf7549B06E68186C91a6737bc0f0CDE1245e349b`
- Metadata URI: `https://api.claw.click/nftid/metadata`

**Pricing:**
- Tier 1 (0-3,999): 0.0015 ETH (~$3 USD)
- Tier 2 (4,000-6,999): 0.003 ETH (~$6 USD)
- Tier 3 (7,000-9,999): 0.0045 ETH (~$9 USD)
- **Free Mint:** 1 per Birth Certificate holder

---

### AgentNFTidRegistry (Linkage System)
**Address:** `0x4774B9387e7067624755eC9BB917aDA8095Adb4d`  
**Basescan:** https://basescan.org/address/0x4774B9387e7067624755eC9BB917aDA8095Adb4d  
**Verified:** ✅ Yes  
**Block:** 43049465  
**Gas Used:** 1,081,943 gas * 0.005267973 gwei = 0.000005699646511539 ETH

**Constructor Args:**
- ClawdNFT: `0x553016FA9Ead8ACFa1d96220901f1e91EEB135f4`
- Birth Certificate: `0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B`

---

### TraitRegistry (Helper Contract)
**Address:** `0x854587f9A7640174c708408A122Bd4B63Ae34a31`  
**Basescan:** https://basescan.org/address/0x854587f9A7640174c708408A122Bd4B63Ae34a31  
**Verified:** ✅ Yes  
**Block:** 43049421  
**Gas Used:** 1,062,836 gas * 0.00500015 gwei = 0.0000053143394254 ETH

---

## 💻 Frontend Integration

### Updated Files
- ✅ `app/src/lib/contracts/clawdNFT.ts` - Base address added
- ✅ `app/src/lib/contracts/nftidRegistry.ts` - Base address added
- ✅ `app/src/app/soul/page.tsx` - Switched to Base, removed dummy data
- ✅ `app/src/app/soul/[tokenId]/page.tsx` - Switched to Base
- ✅ `app/src/lib/hooks/useClawdNFTMint.ts` - Switched to Base
- ✅ `app/src/lib/hooks/useLinkNFTid.ts` - Switched to Base
- ✅ `app/src/lib/nftidLinkage.ts` - Switched to Base registry

### Changes Made
1. **Network Switch:** All NFTid code now uses Base mainnet instead of Sepolia
2. **Dummy Data Removed:** Hardcoded minted NFTs removed from soul page
3. **Explorer Links:** All Etherscan links changed to Basescan
4. **Contract Addresses:** Frontend config updated with Base addresses
5. **Build:** ✅ Passing with no errors

---

## 📊 Test Checklist

### Before Going Live
- [ ] **Connect wallet on Base** - Switch to Base network in wallet
- [ ] **Check free mint eligibility** - Test with Birth Certificate holder
- [ ] **Mint NFTid** - Test paid mint (0.0015 ETH)
- [ ] **Verify traits display** - Check NFTid image renders correctly
- [ ] **Test linkage** - Link NFTid to agent wallet
- [ ] **Verify on agent page** - Check linked NFTid shows on immortal agent page
- [ ] **Check treasury** - Verify payments go to SAFE
- [ ] **Test metadata API** - Ensure https://api.claw.click/nftid/metadata/{tokenId} works

---

## 🚀 Deployment Commands Used

```bash
# 1. Deploy ClawdNFT + TraitRegistry
cd NFTid
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast --verify \
  --etherscan-api-key 69U9FKJK6A46748RA94DYBRJSQCHC8191C

# 2. Deploy AgentNFTidRegistry
forge script script/DeployRegistryBase.s.sol:DeployRegistryBase \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast --verify \
  --etherscan-api-key 69U9FKJK6A46748RA94DYBRJSQCHC8191C

# 3. Build frontend
cd app
npm run build  # ✅ Success

# 4. Deploy to Vercel
vercel --prod  # Run manually (needs login)
```

---

## 🔗 Important Links

### Contracts
- **ClawdNFT:** https://basescan.org/address/0x553016FA9Ead8ACFa1d96220901f1e91EEB135f4
- **AgentNFTidRegistry:** https://basescan.org/address/0x4774B9387e7067624755eC9BB917aDA8095Adb4d
- **TraitRegistry:** https://basescan.org/address/0x854587f9A7640174c708408A122Bd4B63Ae34a31

### Frontend
- **Soul Page:** https://www.claw.click/soul
- **Agent Page:** https://www.claw.click/immortal/agent/[address]

### Tools
- **Basescan:** https://basescan.org
- **Base RPC:** https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J

---

## 💰 Total Deployment Cost

- **ClawdNFT:** 0.00001061658348795 ETH
- **AgentNFTidRegistry:** 0.000005699646511539 ETH
- **TraitRegistry:** 0.0000053143394254 ETH
- **Total:** ~0.000022 ETH (~$1.10 USD at current prices)

---

## 📝 Notes

1. **Treasury Address:** All mint proceeds go to SAFE at 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b
2. **Free Mint Logic:** Only Birth Certificate holders get 1 free mint (tracked on-chain)
3. **Metadata API:** Must be live at https://api.claw.click/nftid/metadata
4. **Trait Uniqueness:** Enforced on-chain - no duplicate combinations possible
5. **Max Supply:** 10,000 NFTids total
6. **Network:** Base mainnet only (no Sepolia in production)

---

## ✅ Status: DEPLOYED & READY

All contracts deployed and verified on Base mainnet. Frontend code updated and committed. Ready for production testing at https://www.claw.click/soul

**Next Step:** Deploy frontend to Vercel and test full flow on Base mainnet.
