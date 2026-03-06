# Final Manual Steps 🦞

## What's Been Done Automatically

✅ **Frontend Code** - All fixed and committed
✅ **ZAUTH Endpoint** - Created at `/.well-known/vector-verify`
✅ **Contract Code** - Updated with access control
✅ **All Changes Committed** - Ready to deploy

---

## What You Need To Do Manually

### 1. Deploy Registry Contract (5 minutes)

Foundry won't broadcast without interactive confirmation. Run this:

```powershell
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\NFTid

# Set environment
$env:ETH_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"

# Deploy (will ask for confirmation)
forge create contracts/AgentNFTidRegistry.sol:AgentNFTidRegistry `
  --rpc-url $env:ETH_RPC_URL `
  --private-key f19cc39af27c27c23e99f5bed30cc97b6a9b35f2f93bb22e04e5db8b7cd4e5b4 `
  --constructor-args "0x6c4618080761925A6D92526c0AA443eF03a92C96" "0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132" `
  --legacy `
  --verify `
  --etherscan-api-key 69U9FKJK6A46748RA94DYBRJSQCHC8191C
```

**Save the deployed address!** It will print something like:
```
Deployed to: 0xABCD1234...
```

### 2. Update Frontend Config (1 minute)

Edit `app/src/lib/contracts/nftidRegistry.ts` line 4:

```typescript
// Change this:
sepolia: '0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B' as const,

// To your new address:
sepolia: '0xYOUR_NEW_ADDRESS_HERE' as const,
```

### 3. Test ZAUTH Endpoint (1 minute)

```powershell
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\app
npm run dev
```

Visit: http://localhost:3000/.well-known/vector-verify

Should return:
```json
{
  "token": "a91ac15773b4bf46085363711772201475acf87e201793536d69f881d9c310b9"
}
```

### 4. Deploy to Production (5 minutes)

Push changes and let Vercel deploy:

```powershell
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click
git add -A
git commit -m "feat: add ZAUTH verification endpoint"
git push origin main
```

Wait for Vercel deployment, then test:
- https://www.claw.click/.well-known/vector-verify

### 5. Test Full Flow (10 minutes)

**Prerequisites:**
- Create an agent first to get Birth Certificate
- Have some Sepolia ETH (~0.02 ETH)

**Test Steps:**

1. **Free Mint** at `/soul`
   - Should show "Free Mint Available" if you have Birth Certificate
   - Click "Claim Free Mint"
   - Should send **0 ETH** (only gas)

2. **NFTid Detail** at `/soul/[tokenId]`
   - NFT should display correctly (not overflowing)
   - Shows rarity score and tier

3. **Link NFTid** at `/soul/[tokenId]`
   - Enter agent wallet **you created**
   - Click "Link to Agent"
   - Should succeed

4. **Verify Linking** at `/immortal/agent/[address]`
   - Should show NFTid visualization (96x96)
   - "View NFTid Details →" button works
   
5. **Test Access Control**
   - Try linking to agent **you didn't create**
   - Should fail with "Not authorized"

6. **Agent Create Flow** at `/immortal/create`
   - Click 🤖 Agent → Shows CLI instructions only
   - Click 👤 Human → Shows 6-step form

---

## Current Status

### Deployed Contracts (Sepolia)
- ✅ ClawdNFT: `0x6c4618080761925A6D92526c0AA443eF03a92C96`
- ✅ BirthCertificate: `0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132`
- ⏳ AgentNFTidRegistry: **Awaiting deployment** (Step 1)

### Code Changes
- ✅ Access control added to registry
- ✅ Free mint value calculation fixed
- ✅ NFTid sizing fixed
- ✅ Agent CLI instructions separated
- ✅ ZAUTH endpoint created
- ✅ All changes committed to GitHub

### ZAUTH Verification
- ✅ Endpoint created: `/.well-known/vector-verify`
- ⏳ Test after deployment (Step 3)
- ⏳ Verify on production (Step 4)

---

## Troubleshooting

### Free Mint Fails
**Cause:** No Birth Certificate  
**Fix:** Create an agent at `/immortal/create` first

### Linking Fails
**Cause:** Not authorized  
**Fix:** Only link agents you created or are the agent wallet

### ZAUTH Not Working
**Cause:** Route not accessible  
**Fix:** Ensure `.well-known/vector-verify/route.ts` deployed correctly

---

**Total Time:** ~20 minutes
**Ready to go!** 🚀

Complete steps 1-5 in order. Everything else is done!
