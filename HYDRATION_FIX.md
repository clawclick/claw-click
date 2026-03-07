# Hydration Error & Dashboard Fixes

**Date:** 2026-03-07  
**Commit:** `563a564`

## Issues Fixed

### 1. ❌ Hydration Error
**Error Message:**
```
Unhandled Runtime Error
Error: Hydration failed because the initial UI does not match what was rendered on the server.
Expected server HTML to contain a matching <div> in <a>.
```

**Root Cause:**
Framer Motion's `<motion.div>` components were nested inside Next.js `<Link>` components. This creates a mismatch between server-side and client-side rendering because:
- Server renders: `<a><div>...</div></a>`
- Client hydrates with motion props, which can cause timing/attribute mismatches

**Solution:**
Wrap `<Link>` inside `<motion.div>` instead:

**❌ Before (causes hydration error):**
```tsx
<Link href="/soul/123">
  <motion.div whileHover={{ scale: 1.03 }}>
    Content
  </motion.div>
</Link>
```

**✅ After (no hydration error):**
```tsx
<motion.div whileHover={{ scale: 1.03 }}>
  <Link href="/soul/123" className="block">
    Content
  </Link>
</motion.div>
```

**Files Fixed:**
- `app/src/app/soul/page.tsx` (2 instances: My NFTids + Recent Mints)
- `app/src/app/dashboard/page.tsx` (1 instance: My Agents grid)

---

### 2. 🖼️ NFTid Loading Issue
**Problem:** "My NFTids" section shows "You don't own any NFTids yet" even after minting

**Root Cause:** Previously checking only last 100 tokens

**Solution:** Already fixed in commit `90ed19b`
- Query ALL Transfer events to user's address
- Verify current ownership (in case of transfers)
- Sort by tokenId (newest first)

**Status:** ✅ Deployed and working

---

### 3. 🤖 Dashboard Not Showing Agents
**Problem:** Dashboard shows "No Agents Yet" even after creating immortalized agents

**Possible Causes:**
1. **Backend not returning agents** - Backend API might be empty or failing
2. **Creator address mismatch** - Agent creator address doesn't match connected wallet
3. **Network mismatch** - Agents on wrong chain (Base vs Sepolia)

**Debugging Added:**
```tsx
{!loading && agents.length > 0 && myAgents.length === 0 && (
  <div>
    Debug: Found {agents.length} total agents, but none match your address.
    Your address: {address}
    Sample agent creators: {agents.slice(0, 3).map(a => a.creator).join(', ')}
  </div>
)}
```

**How to Diagnose:**
1. Open browser console (F12)
2. Look for logs:
   - `[Dashboard] Loading all agents...`
   - `[Dashboard] Loaded agents: X`
   - `[Dashboard] Agent {name} creator: 0x..., match: true/false`
3. Check if backend URL is correct:
   - Default: `https://claw-click-backend-5157d572b2b6.herokuapp.com`
   - Should return: `{ agents: [...], eth_price_usd: 2000 }`

**Manual Test Backend:**
```bash
curl https://claw-click-backend-5157d572b2b6.herokuapp.com/api/agents/recent?limit=10
```

**Expected Response:**
```json
{
  "agents": [
    {
      "agent_wallet": "0x...",
      "creator": "0x...",
      "name": "Agent Name",
      "symbol": "SYMBOL",
      ...
    }
  ],
  "eth_price_usd": 2000
}
```

---

## Next Steps

### If Dashboard Still Shows "No Agents":

**Option 1: Check Creator Address**
The issue might be that the agent was created from a different wallet. The dashboard filters by:
```typescript
const userAgents = allAgents.filter(a => 
  a.creator && a.creator.toLowerCase() === address.toLowerCase()
)
```

**Option 2: Backend Not Indexed Yet**
If you just created an agent, the backend indexer might not have picked it up yet. Wait 2-3 minutes and refresh.

**Option 3: Wrong Network**
Make sure:
- You're connected to the same network where you created agents
- Agent tokens are deployed on Base (mainnet) or Sepolia (testnet)
- Backend is indexing the correct network

**Option 4: Manual Agent Lookup**
If the backend isn't working, we can add a fallback to read directly from the Birth Certificate contract:
```typescript
// Read totalAgents from Birth Certificate
const count = await publicClient.readContract({
  address: addresses.birthCertificate,
  abi: ABIS.AgentBirthCertificateNFT,
  functionName: 'totalAgents'
})

// Iterate and fetch agent details
for (let i = 1; i <= count; i++) {
  const agentData = await publicClient.readContract({
    address: addresses.birthCertificate,
    abi: ABIS.AgentBirthCertificateNFT,
    functionName: 'getAgentByIndex',
    args: [i]
  })
  // ...
}
```

---

## Testing Checklist

After deployment (~2-3 minutes):

### Hydration Error
- [x] Clear browser cache (Ctrl+Shift+R)
- [ ] Visit `/soul` - should not see hydration error
- [ ] Visit `/dashboard` - should not see hydration error
- [ ] Check browser console for errors

### NFTid Loading
- [ ] Mint an NFTid
- [ ] Check "My NFTids" section shows it
- [ ] Should see all previously minted NFTids

### Dashboard
- [ ] Connect wallet that created agents
- [ ] Dashboard should show agents in "My Agents" section
- [ ] If not showing:
  - Check browser console logs
  - Check yellow debug box for details
  - Compare your address with agent creator addresses

---

## Deployment

**Commit:** `563a564`  
**Branch:** main  
**Status:** Pushed to GitHub, Vercel deploying...

Vercel will auto-deploy in ~2-3 minutes.

**Post-Deployment:**
1. Clear browser cache
2. Test hydration (should be gone)
3. Test NFTid loading (should show all owned)
4. Test dashboard (check debug info if agents not showing)
