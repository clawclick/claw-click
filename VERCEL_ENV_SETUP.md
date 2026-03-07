# Vercel Environment Variables Setup - CRITICAL

## ❌ ROOT CAUSE OF ALL ISSUES

The app `.env.local` was missing `NEXT_PUBLIC_NETWORK=mainnet`, causing:
- Agent queries to hit **Sepolia** instead of **Base**
- NFTid queries to fail (wrong chain)
- Dashboard showing nothing
- "Agent Not Found" errors

---

## 🔧 REQUIRED VERCEL ENVIRONMENT VARIABLES

Go to: **Vercel Dashboard → claw-click → Settings → Environment Variables**

Add these variables for **Production**:

```
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_ALCHEMY_API_BASE=BdgPEmQddox2due7mrt9J
NEXT_PUBLIC_ALCHEMY_API_ETH_SEPOLIA=BdgPEmQddox2due7mrt9J
NEXT_PUBLIC_CLAWCLICK_BACKEND_URL=https://claw-click-backend-5157d572b2b6.herokuapp.com
NEXT_PUBLIC_APP_NAME=Claw.click
NEXT_PUBLIC_TAGLINE=Agent only Launchpad. Where AI agents launch tokens, earn fees, and make a living on-chain.
```

---

## 🚨 BACKEND CONFIGURATION

The backend at `https://claw-click-backend-5157d572b2b6.herokuapp.com` MUST be configured to:

1. **Query Base Mainnet (Chain ID 8453)** - NOT Sepolia
2. **Index TokenLaunched events from Base Factory:** `0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a`
3. **Track Uniswap V4 pools on Base**

### Backend Environment Variables Needed:
```
NETWORK=mainnet
CHAIN_ID=8453
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
FACTORY_ADDRESS=0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a
POOL_MANAGER=0x498581ff718922c3f8e6a244956af099b2652b2b
```

**Without correct backend config, the agent will NOT appear in:**
- Dashboard (/dashboard)
- Immortalized Agents feed
- Agent page lookups

---

## 📋 STEPS TO FIX

### 1. Set Vercel Environment Variables
- Go to Vercel dashboard
- Navigate to: **claw-click → Settings → Environment Variables**
- Add all variables listed above
- **Redeploy** the site (trigger new deployment)

### 2. Verify Backend Configuration
- Check backend Heroku dashboard: https://dashboard.heroku.com/apps/claw-click-backend-5157d572b2b6
- Go to **Settings → Config Vars**
- Ensure `NETWORK=mainnet` and `CHAIN_ID=8453`
- If not set, add them
- **Restart** the backend dyno

### 3. Test After Deploy
- Wait 2-3 minutes for Vercel deployment
- Clear browser cache or use incognito
- Test agent page: https://www.claw.click/immortal/agent/0x645164C78398C301C3cFA1E802d494895e0b7167
- Should load correctly with agent data

---

## 🧪 VERIFICATION CHECKLIST

After setting env vars and redeploying:

- [ ] Agent page loads (no "Agent Not Found")
- [ ] Dashboard shows your agent
- [ ] Immortalized feed shows your agent
- [ ] Owned NFTids appear in /soul
- [ ] Free mint claim works (if Birth Cert holder)

---

## 🔍 DEBUG COMMANDS

### Check Frontend Network:
Open browser console on claw.click and run:
```javascript
console.log(process.env.NEXT_PUBLIC_NETWORK)
// Should output: "mainnet"
```

### Check Backend is Running:
```bash
curl https://claw-click-backend-5157d572b2b6.herokuapp.com/api/agents/recent?limit=1
```
Should return JSON with agents array.

### Check Agent in Backend:
```bash
curl https://claw-click-backend-5157d572b2b6.herokuapp.com/api/token/0x645164C78398C301C3cFA1E802d494895e0b7167
```
Should return your agent's token data.

---

## 💡 IMPORTANT NOTES

1. **Frontend AND Backend must match networks**
   - Frontend: Base (via NEXT_PUBLIC_NETWORK=mainnet)
   - Backend: Base (via NETWORK=mainnet, CHAIN_ID=8453)

2. **Environment variables are build-time**
   - Must **redeploy** Vercel after changing env vars
   - Variables don't update until new build

3. **Backend indexes on startup**
   - If backend was on Sepolia, it needs to **reindex Base** after config change
   - May take a few minutes to catch up

---

## 🚀 QUICK FIX STEPS

**If you have Vercel access:**
1. Vercel → Settings → Environment Variables
2. Add `NEXT_PUBLIC_NETWORK=mainnet`
3. Trigger redeploy (or git push will auto-deploy)

**If you have Backend access:**
1. Heroku → claw-click-backend → Settings → Config Vars
2. Set `NETWORK=mainnet` and `CHAIN_ID=8453`
3. Restart dyno

**Then test:**
- https://www.claw.click/immortal/agent/0x645164C78398C301C3cFA1E802d494895e0b7167

---

**Files Updated:**
- `.env.local` - Added NEXT_PUBLIC_NETWORK=mainnet
- `.env.production` - Created with all mainnet vars
- This guide for Vercel setup

**Status:** Local build passes ✅  
**Next:** Set Vercel env vars → Redeploy → Test
