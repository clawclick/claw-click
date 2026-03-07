# Base Mainnet Deployment Plan

**Date:** March 7, 2026  
**Target Network:** Base (Chain ID: 8453)  
**Deployer Address:** 0x958fC4d5688F7e7425EEa770F54d5126a46A9104

## Pre-Deployment Checklist

### ✅ Contract Audits
- [x] ClawdNFT pricing logic verified
- [x] AgentNFTidRegistry linkage logic verified
- [x] Free mint for Birth Certificate holders confirmed
- [x] Tiered pricing (3/6/9 USD equivalent) confirmed
- [x] Trait uniqueness guarantee tested on Sepolia

### ✅ Frontend Ready
- [x] Custom ID icon implemented (no emoji)
- [x] Trait parser utility created (handles all formats)
- [x] Build succeeds with no errors
- [x] NFTid display fixed
- [x] Agent page linkage UI polished

### ⏳ Deployment Steps

#### 1. Deploy Contracts to Base Mainnet

**ClawdNFT Contract:**
```bash
cd NFTid
forge script script/Deploy.s.sol:DeployClawdNFT \
  --rpc-url https://mainnet.base.org \
  --private-key $MAINNET_DEPLOYER_PK \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**Required Constructor Args:**
- `_birthCertificateContract`: Base mainnet Birth Certificate address (from main contracts/)
- `_treasury`: 0x958fC4d5688F7e7425EEa770F54d5126a46A9104 (deployer = treasury for now)
- `_baseMetadataURI`: `https://api.claw.click/nftid/metadata` (or IPFS gateway)

**AgentNFTidRegistry Contract:**
```bash
cd NFTid
forge script script/DeployRegistry.s.sol:DeployAgentNFTidRegistry \
  --rpc-url https://mainnet.base.org \
  --private-key $MAINNET_DEPLOYER_PK \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

#### 2. Update Frontend Config

**app/src/lib/contracts/clawdNFT.ts:**
```typescript
export const CLAWD_NFT_ADDRESS = {
  sepolia: '0x6c4618080761925A6D92526c0AA443eF03a92C96' as const,
  base: '0x<DEPLOYED_ADDRESS>' as const, // UPDATE THIS
} as const
```

**app/src/lib/contracts/nftidRegistry.ts:**
```typescript
export const NFTID_REGISTRY_ADDRESS = {
  sepolia: '<SEPOLIA_ADDRESS>' as const,
  base: '0x<DEPLOYED_ADDRESS>' as const, // UPDATE THIS
} as const
```

#### 3. Deploy Frontend to Vercel

```bash
cd app
npm run build  # Verify no errors
vercel --prod
```

#### 4. Post-Deployment Verification

- [ ] Verify contracts on Basescan
- [ ] Test free mint for Birth Certificate holder
- [ ] Test paid mint (0.0015 ETH tier 1)
- [ ] Verify trait generation (no duplicates)
- [ ] Test NFTid → Agent linking
- [ ] Verify metadata API endpoint
- [ ] Check treasury receives payments

## Contract Addresses (Post-Deployment)

### Base Mainnet
- **ClawdNFT:** TBD
- **AgentNFTidRegistry:** TBD
- **Treasury:** 0x958fC4d5688F7e7425EEa770F54d5126a46A9104

### Sepolia Testnet (Existing)
- **ClawdNFT:** 0x6c4618080761925A6D92526c0AA443eF03a92C96
- **AgentNFTidRegistry:** (check nftidRegistry.ts)

## Risk Assessment

### Low Risk ✅
- Contracts tested extensively on Sepolia
- Pricing logic simple and verified
- Free mint gated by Birth Certificate ownership
- Trait uniqueness enforced on-chain

### Medium Risk ⚠️
- Metadata API must be reliable (consider IPFS backup)
- Frontend must handle both Sepolia and Base correctly
- Users might confuse networks (need clear UI indicators)

### Mitigation
- Deploy metadata to both centralized API + IPFS
- Add prominent network indicator in UI
- Start with small treasury balance (can add more later)

## Rollback Plan

If critical issues found after deployment:
1. Pause new mints (add pausable to contract if needed)
2. Fix frontend/backend issues
3. Deploy contract fixes if necessary
4. Announce migration plan to users

## Support & Monitoring

- Monitor Basescan for mint transactions
- Watch for failed transactions (trait generation issues)
- Track treasury balance
- Monitor metadata API uptime
- Check Discord for user reports

## Budget

- **Contract Deployment:** ~0.01 ETH per contract (~$0.50 at current Base gas prices)
- **Vercel Hosting:** Free tier OK for now
- **Total Estimated Cost:** < 0.05 ETH (~$2.50)

---

**Status:** Ready for deployment  
**Blocker:** None - all fixes completed  
**Next Step:** Deploy contracts to Base mainnet
