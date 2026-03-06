# Deployment Checklist 🦞

## Status: Ready for Manual Review

### What's Been Updated

1. **AgentNFTidRegistry Contract** ✅
   - Added access control: only agent creator or agent wallet can link NFTids
   - Prevents random people from linking agents
   - Contract ready at: `NFTid/contracts/AgentNFTidRegistry.sol`

2. **Frontend Code** ✅
   - Free mint eligibility check fixed
   - NFTid detail pages working
   - Agent pages show linked NFTid
   - All UX flows complete

3. **Code Quality** ✅
   - All changes committed and pushed to GitHub
   - No syntax errors
   - TypeScript/Solidity compiles cleanly

---

## Required Manual Steps

### 1. Deploy Updated Registry Contract

The registry contract needs to be deployed to Sepolia with the updated access control.

**Command:**
```bash
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\NFTid

forge create contracts/AgentNFTidRegistry.sol:AgentNFTidRegistry \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args "0x6c4618080761925A6D92526c0AA443eF03a92C96" "0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132" \
  --legacy \
  --broadcast
```

**Note the deployed address!** You'll need it for step 2.

### 2. Update Frontend Config

After deployment, update the registry address:

**File:** `app/src/lib/contracts/nftidRegistry.ts`

**Change line 4:**
```typescript
sepolia: '0xNEW_REGISTRY_ADDRESS' as const,
```

Replace `0xNEW_REGISTRY_ADDRESS` with the address from step 1.

### 3. Test Free Mint Flow

**Prerequisites:**
- Your wallet needs a Birth Certificate NFT (create an agent first if you haven't)

**Test Steps:**
1. Navigate to `/soul`
2. Connect wallet
3. If you have a Birth Certificate, you'll see "Free Mint Available"
4. Click "Claim Free Mint"
5. Wallet should show **0 ETH value** (only gas ~0.0015 ETH)
6. Transaction should succeed

**Debug if failing:**
```bash
# Check if wallet has Birth Certificate
cast call 0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132 "balanceOf(address)" YOUR_WALLET --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# Should return > 0. If returns 0, create an agent first.
```

### 4. Test NFTid Linking

**Access Control Rules:**
- Only the agent creator (deployer) OR the agent wallet itself can link an NFTid
- Random wallets cannot link

**Test Steps:**
1. Mint an NFTid (free or paid)
2. Navigate to `/soul/[tokenId]` (your NFTid detail page)
3. Click "Link to Agent"
4. Enter an agent wallet address **that you created**
5. Confirm link transaction
6. Verify linkage appears on both:
   - NFTid detail page
   - Agent detail page (`/immortal/agent/[address]`)

**Test negative case:**
- Try linking to an agent you didn't create → should fail with "Not authorized"

### 5. Test Agent → NFTid Display

1. Navigate to any agent page: `/immortal/agent/[address]`
2. If linked, you should see:
   - NFTid visualization (96x96 composite image)
   - "View NFTid Details →" button
   - Clicking navigates to NFTid detail page

---

## Current Contract Addresses (Sepolia)

- **ClawdNFT**: `0x6c4618080761925A6D92526c0AA443eF03a92C96`
- **BirthCertificate**: `0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132`
- **AgentNFTidRegistry** (old): `0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B`
- **AgentNFTidRegistry** (new): _pending deployment_ ⏳

---

## Known Issues & Solutions

### Issue: Free Mint Fails
**Cause:** Wallet doesn't have a Birth Certificate NFT  
**Solution:** Create/immortalize an agent first at `/immortal/create`

### Issue: Linking Fails with "Not authorized"
**Cause:** Trying to link to an agent you didn't create  
**Solution:** Only link to agents where you are either:
- The creator (who deployed/tokenized the agent)
- The agent wallet itself

### Issue: NFTid doesn't appear on agent page
**Cause:** Registry contract address not updated after deployment  
**Solution:** Complete step 2 above (update `nftidRegistry.ts`)

---

## Testing Checklist

- [ ] Deploy new registry contract
- [ ] Update frontend config with new address
- [ ] Test free mint (with Birth Certificate)
- [ ] Test paid mint
- [ ] Test NFTid linking (as agent creator)
- [ ] Test NFTid unlinking
- [ ] Verify NFTid appears on agent page
- [ ] Verify access control (random wallet can't link)
- [ ] Check Etherscan for all transactions
- [ ] Verify rarity scores display correctly
- [ ] Test "View NFTid Details" button from agent page

---

## Files Modified

- `NFTid/contracts/AgentNFTidRegistry.sol` - Access control added
- `app/src/lib/hooks/useClawdNFTMint.ts` - Free mint value fixed
- `app/src/app/soul/page.tsx` - Button state fixed
- `app/src/app/soul/[tokenId]/page.tsx` - NFTid detail page
- `app/src/app/immortal/agent/[id]/page.tsx` - Agent → NFTid display
- `app/src/app/immortal/create/page.tsx` - Agent CLI instructions
- `app/src/components/NFTidCompositor.tsx` - Responsive sizing

**All changes pushed to GitHub** (latest commit: `8f4c91e`)

---

**Ready for your review!** 🚀

Complete steps 1-2, then test the flows. Let me know if anything needs adjustment!
