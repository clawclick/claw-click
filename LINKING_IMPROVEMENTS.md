# NFTid Linking Improvements

**Date:** March 7, 2026

---

## Changes Made

### 1. ✅ NFTid Mint in Creation Flow Already Working

The NFTid free mint is already integrated into the immortalization flow:
- **Step 6:** Agent creation completes
- **Free NFTid claim UI** shows automatically on success screen
- **Automatic redirect** to `/soul/{tokenId}` after mint completes (2 second delay)

**No changes needed** — this is already working as requested.

---

### 2. ✅ Improved Agent Linking Error Handling

**Problem:** "User rejected the request" error was not user-friendly

**Solution:** Added comprehensive error handling with specific messages:

#### Updated `useLinkNFTid` hook:
- Added explicit `gas: 500000n` limit to prevent gas estimation issues
- Re-throw errors to allow UI to handle them

#### Updated NFTid detail page:
- Added try/catch with user-friendly error messages:
  - "You must be the creator of this agent"
  - "Agent does not have a birth certificate"  
  - "Transaction rejected in wallet"
- Added helper text: "You can only link agents that YOU created from this wallet"

---

## How Agent Linking Works

### Requirements (On-Chain)
```solidity
// AgentNFTidRegistry checks:
1. User owns the NFTid ✅
2. Agent has birth certificate ✅
3. User is creator OR agent wallet ✅
```

### Your Example
- **Your wallet:** `0xAc95AF64BB3fd22C95C4A03a82bCcA8A46AE7718`
- **Created agent:** `0x645164c78398c301c3cfa1e802d494895e0b7167`
- **Minted NFTid:** #0
- **Birth Certificate:** Agent has cert with `creator = 0xAc95...` (YOUR wallet)
- **Result:** ✅ Link should work

### Contract Logic
```solidity
// Get Birth Certificate data for agent
IAgentBirthCertificate.AgentBirth memory agentData = birthCertificateContract.getAgent(birthCertId);

// Check if user is authorized
require(
    msg.sender == agentData.creator || msg.sender == agentWallet,
    "Not authorized: must be agent creator or agent wallet"
);
```

**Simple validation:**
- You own NFTid #0 ✅
- You created the agent (Birth Cert shows creator = your wallet) ✅
- Link allowed ✅

---

## Testing Instructions

### Test NFTid Mint After Immortalization
1. Go to https://www.claw.click/immortal/create
2. Complete immortalization (steps 1-6)
3. On success screen, click "Claim Free NFTid"
4. Approve transaction in wallet
5. Wait 2 seconds after confirmation
6. Should auto-redirect to `/soul/{tokenId}`

### Test Agent Linking
1. Go to https://www.claw.click/soul/0 (your minted NFTid)
2. Click "Link to Agent" button
3. Paste agent wallet: `0x645164c78398c301c3cfa1e802d494895e0b7167`
4. Click "Confirm Link"
5. Approve transaction in wallet
6. Should link successfully

**If linking fails:**
- Error message will explain why (creator check, birth cert check, etc)
- Check that you're using the wallet that created the agent
- Check that agent has birth certificate

---

## Common Error Messages

### "You must be the creator of this agent"
**Cause:** The connected wallet is not the creator recorded in the Birth Certificate
**Solution:** Connect the wallet you used to create/immortalize the agent

### "Agent does not have a birth certificate"
**Cause:** The agent wallet you entered hasn't been immortalized
**Solution:** Only immortalized agents (with birth certificates) can be linked

### "Transaction rejected"
**Cause:** You rejected the transaction in your wallet
**Solution:** Try again and click "Confirm" in MetaMask/wallet

### "User rejected the request"
**Cause:** Usually means wallet rejected OR gas estimation failed
**Solution:** Try again, make sure you have enough ETH for gas

---

## Technical Details

### Gas Limit
```typescript
gas: 500000n  // 500k gas (plenty for linking)
```

Why explicit gas limit?
- Prevents gas estimation failures
- Ensures predictable gas costs
- Covers worst-case scenario (unlinking old links + creating new link)

### Contract Interaction
```typescript
writeContract({
  address: NFTID_REGISTRY_ADDRESS.base,
  abi: NFTID_REGISTRY_ABI,
  functionName: 'linkNFTid',
  args: [BigInt(nftidTokenId), agentWallet as `0x${string}`],
  chainId: base.id,
  gas: 500000n,
})
```

---

## Files Changed

1. **`app/src/lib/hooks/useLinkNFTid.ts`**
   - Added explicit gas limit
   - Re-throw errors for UI handling

2. **`app/src/app/soul/[tokenId]/page.tsx`**
   - Improved error messages in handleLink()
   - Added helper text explaining link requirements

---

## Summary

**NFTid mint flow:** ✅ Already working — shows after immortalization, auto-redirects  
**Agent linking:** ✅ Improved with better error messages and validation

The linking contract logic is correct and simple:
- User owns NFTid ✅
- User created agent (checked via Birth Certificate creator field) ✅
- Transaction succeeds ✅

If linking still fails after these changes, it means either:
1. Wrong wallet connected (not the creator)
2. Agent not immortalized (no birth certificate)
3. Wallet rejecting transaction (user action needed)

All error messages now clearly explain what went wrong.
