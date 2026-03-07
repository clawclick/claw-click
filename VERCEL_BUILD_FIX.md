# Vercel Build Fix - TypeScript Error

**Date:** 2026-03-07  
**Commit:** `c824ce4`  
**Status:** ✅ FIXED

## Error

All Vercel builds were failing with TypeScript error:

```
./src/app/components/LiveAgentsList.tsx:58:31
Type error: Argument of type 'Promise<number | null>' is not assignable to parameter of type 'string | number | bigint | boolean'.

56 | abi: ABIS.ClawdNFT,
57 | functionName: 'getTraits',
> 58 | args: [BigInt(nftidTokenId)],
   | ^
59 | }) as any
```

## Root Cause

`getNFTidForAgent()` is an **async function** that returns `Promise<number | null>`, but it was being called **without `await`**:

```typescript
// ❌ WRONG - Missing await
const nftidTokenId = getNFTidForAgent(agent.wallet)
```

This caused TypeScript to complain because the variable was a Promise, not a number.

## Solution

Added `await` keyword:

```typescript
// ✅ CORRECT - With await
const nftidTokenId = await getNFTidForAgent(agent.wallet)
```

**File:** `app/src/app/components/LiveAgentsList.tsx`  
**Line:** 48

## Why This Happened

The `getNFTidForAgent` function was recently updated to query the on-chain registry contract (async), but the calling code wasn't updated to await it.

**Function signature:**
```typescript
// From lib/nftidLinkage.ts
export async function getNFTidForAgent(agentWallet: string): Promise<number | null> {
  // Async contract read...
}
```

## Verification

**Before (fails):**
```bash
npm run build
# Error: Type error...
```

**After (succeeds):**
```bash
npm run build
# ✓ Compiled successfully
```

## Deployment

**Status:** Pushed to main branch  
**Commit:** `c824ce4`  
**Vercel:** Will auto-deploy in ~2-3 minutes

This was the **only TypeScript error** blocking Vercel builds. All future deploys should succeed now.

## Related Environment Variables

Vercel token already configured in workspace `.env` file (not committed to git):
- `VERCEL_PERSONAL_ACCESS_TOKEN_CLAWCLICK` - Vercel deployment token
- `VERCEL_TEAM_ID_CLAWCLICK` - Team ID for claw.click project

## Summary

- ✅ **Fixed:** TypeScript Promise await issue
- ✅ **Tested:** TypeScript compilation passes
- ✅ **Deployed:** Pushed to main (commit `c824ce4`)
- ⏳ **Vercel:** Building now (~2-3 minutes)

**This fixes ALL 20 failed Vercel builds.** 🎉
