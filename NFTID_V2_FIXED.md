# NFTid V2 - Free Mint Logic Fixed

**Date:** March 7, 2026  
**Commit:** `3ae304e`

---

## The Problem You Identified

You were absolutely right. The immortalization system works perfectly:
- ✅ Agent creation works
- ✅ Birth Certificates minted to agent wallets
- ✅ Everything on-chain and verified

**The bug was in NFTid free mint logic:**

### OLD (BROKEN) Logic
```solidity
// ClawdNFT V1
function isEligibleForFreeMint(address user) public view returns (bool) {
    // Check if USER owns a Birth Certificate
    return IERC721(birthCertificateContract).balanceOf(user) > 0;
}
```

**Problem:** Birth Certificates are minted to AGENT wallets (like `0xdd563...`), NOT creator wallets.  
**Result:** Creators never qualified for free mints ❌

### NEW (FIXED) Logic
```solidity
// ClawdNFT V2
function countAgentsCreated(address creator) public view returns (uint256) {
    uint256 count = 0;
    uint256 totalAgents = birthCertificateContract.totalAgents();
    
    // Loop through all Birth Certificates
    for (uint256 i = 1; i <= totalAgents; i++) {
        IAgentBirthCertificate.AgentBirth memory agent = birthCertificateContract.getAgent(i);
        if (agent.creator == creator) {
            count++;
        }
    }
    return count;
}

function getRemainingFreeMints(address user) public view returns (uint256) {
    uint256 agentsCreated = countAgentsCreated(user);
    uint256 used = freeMintsUsed[user];
    return agentsCreated > used ? agentsCreated - used : 0;
}
```

**How it works:**
1. Your wallet: `0x958fC4d5688F7e7425EEa770F54d5126a46A9104`
2. Created agent: `0xdd563db776c16118fd736a91bacd56b3f6b2769d`
3. Agent has Birth Certificate #7
4. Birth Cert #7 has `creator = 0x958f...` (YOUR wallet)
5. V2 contract counts: YOU created 1 agent → YOU get 1 free mint ✅

---

## Deployed Contracts (Base Mainnet)

| Contract | Address | Status |
|----------|---------|--------|
| **ClawdNFT V2** | `0x86d7d293DD9bFE25CA3CAF4Cb09f8d2c266823E0` | ✅ Verified |
| **AgentNFTidRegistry V2** | `0xA51fa0faD4bCec2909B2f1e33bdfaa80f3f7d76B` | ✅ Verified |

**View on Basescan:**
- ClawdNFT V2: https://basescan.org/address/0x86d7d293DD9bFE25CA3CAF4Cb09f8d2c266823E0
- Registry V2: https://basescan.org/address/0xA51fa0faD4bCec2909B2f1e33bdfaa80f3f7d76B

---

## Frontend Changes

### Updated Files
1. **`app/src/lib/contracts/clawdNFT.ts`**
   - Updated address to ClawdNFT V2
   - Added new ABI functions: `countAgentsCreated`, `getRemainingFreeMints`
   - Updated `mint()` signature to take `useFreeMint` boolean

2. **`app/src/lib/contracts/nftidRegistry.ts`**
   - Updated address to Registry V2

3. **`app/src/lib/hooks/useClawdNFTMint.ts`**
   - Added `remainingFreeMints` and `agentsCreated` queries
   - Updated `handleMint()` to pass `useFreeMint` boolean

4. **`app/src/app/immortal/create/page.tsx`**
   - Updated mint call: `args: [true, BigInt(50)]` (useFreeMint, maxAttempts)

### Build Status
✅ Build passed - ready for Vercel deployment

---

## How to Test

### 1. Wait for Vercel Deployment
Vercel should auto-deploy from GitHub push (commit `3ae304e`).  
Check: https://www.claw.click/

### 2. Connect Your Wallet
Wallet: `0x958fC4d5688F7e7425EEa770F54d5126a46A9104`

### 3. Go to NFTid Mint Page
URL: https://www.claw.click/soul

### 4. Check Free Mint Eligibility
The page should show:
- "You have created 1 agent"
- "You have 1 free mint available"
- Mint button shows "Mint FREE" instead of price

### 5. Mint Your Free NFTid
Click "Mint FREE" → Approve in wallet → Wait for confirmation

### 6. Expected Result
- Transaction succeeds with 0 ETH spent (only gas)
- You receive NFTid token #0
- Token shows on https://www.claw.click/soul

---

## Technical Details

### Contract Interface Changes

**ClawdNFT V1 → V2:**
```solidity
// V1
function mint(uint256 maxAttempts) external payable;

// V2
function mint(bool useFreeMint, uint256 maxAttempts) external payable;
```

**New View Functions:**
```solidity
function countAgentsCreated(address creator) external view returns (uint256);
function getRemainingFreeMints(address user) external view returns (uint256);
```

### Free Mint Tracking
```solidity
mapping(address => uint256) public freeMintsUsed;  // Creator → count

// When minting with useFreeMint = true:
if (useFreeMint && isEligibleForFreeMint(msg.sender)) {
    requiredPrice = 0;
    freeMintsUsed[msg.sender]++;
}
```

### Gas Optimization Note
`countAgentsCreated()` loops through all Birth Certificates. With low agent count this is cheap (<100k gas for view call). If agent count grows to 1000+, we can optimize with:
- Event indexing (track creator → agent mapping off-chain)
- Merkle proofs
- Creator registry in Birth Certificate contract

---

## Your Agent Details

**Agent Wallet:** `0xdd563db776c16118fd736a91bacd56b3f6b2769d`  
**Birth Certificate:** #7  
**Creator (You):** `0x958fC4d5688F7e7425EEa770F54d5126a46A9104`  
**Token Address:** `0x645164C78398C301C3cFA1E802d494895e0b7167`

**On Basescan:**
- Agent wallet: https://basescan.org/address/0xdd563db776c16118fd736a91bacd56b3f6b2769d
- Birth Cert in agent wallet: https://basescan.org/token/0x6e9b093fdd12ec34ce358bd70cf59eecb5d1a95b?a=0xdd563db776c16118fd736a91bacd56b3f6b2769d
- Creation tx: https://basescan.org/tx/0xa94b5003d687626bf29c1526ee346a7f367c8a7524f3f47db2d0e3cf1a8031d8

---

## Next Steps

1. ✅ Contracts deployed and verified
2. ✅ Frontend updated and pushed
3. ⏳ Vercel auto-deployment (should be done in ~2-3 minutes)
4. 🧪 **TEST THE FREE MINT** on live site
5. 📝 Report results

If free mint still doesn't work after Vercel deploys, we'll check:
- Contract state (verify `countAgentsCreated(0x958f...)` returns 1)
- Frontend queries (check browser console)
- Transaction reverts (if any)

---

## Summary

**What was broken:** Free mint checked wrong wallet (user instead of creator)  
**What I fixed:** Read `creator` field from Birth Certificate contract  
**How to verify:** Test free mint at https://www.claw.click/soul after Vercel deploys  

The immortalization system itself was perfect — you were right to point that out. The bug was purely in the NFTid free mint eligibility check.
