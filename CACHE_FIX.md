# Link Display Cache Fix

**Issue:** Link succeeds on-chain but UI still shows "Not Linked"  
**Cause:** Wagmi query cache not invalidating after transaction

---

## On-Chain Verification

The link IS working:

```bash
# Check if linked
$ cast call 0xd1C127c68D45ed264ce5251342A47f1C47F39dcF \
  "isNFTidLinked(uint256)(bool)" 0 \
  --rpc-url $BASE_RPC
→ true ✅

# Get linked token
$ cast call 0xd1C127c68D45ed264ce5251342A47f1C47F39dcF \
  "getTokenForNFTid(uint256)(address)" 0 \
  --rpc-url $BASE_RPC
→ 0x645164C78398C301C3cFA1E802d494895e0b7167 ✅
```

**The link exists on-chain.** The issue is purely frontend cache.

---

## The Fix

### 1. Added Auto-Refetch Interval
```typescript
query: {
  enabled: !!nftidTokenId,
  refetchInterval: 5000,  // Refetch every 5 seconds
}
```

### 2. Multiple Refetches After Link Success
```typescript
useEffect(() => {
  if (isLinkSuccess) {
    refetchLinked()        // Immediately
    refetchToken()
    
    setTimeout(() => {     // After 1 second
      refetchLinked()
      refetchToken()
    }, 1000)
    
    setTimeout(() => {     // After 3 seconds
      refetchLinked()
      refetchToken()
    }, 3000)
    
    setTimeout(() => {     // After 5 seconds
      refetchLinked()
      refetchToken()
    }, 5000)
  }
}, [isLinkSuccess])
```

This forces the cache to update multiple times until it picks up the on-chain state.

---

## How to See It Working

### Option 1: Hard Refresh (FASTEST)
1. Press **Ctrl+Shift+R** on the NFTid page
2. Queries will refetch fresh from on-chain
3. Should immediately show "Linked to Token"

### Option 2: Wait for Auto-Refetch
1. Stay on the page
2. After 5 seconds, auto-refetch will trigger
3. Should update to show "Linked to Token"

### Option 3: Navigate Away and Back
1. Go to another page
2. Come back to `/soul/0`
3. Fresh mount will query again

---

## Why This Happened

Wagmi caches query results aggressively to reduce RPC calls. When you:
1. Link NFTid → Token (transaction succeeds ✅)
2. Page refetches → But hits cached "Not Linked" result ❌
3. Cache doesn't invalidate because transaction wasn't tracked

The fix forces multiple refetches and adds a 5-second polling interval to ensure the UI eventually catches up with on-chain state.

---

## Files Changed

1. **`app/src/lib/hooks/useLinkNFTid.ts`**
   - Added `refetchInterval: 5000` to both queries

2. **`app/src/app/soul/[tokenId]/page.tsx`**
   - Multiple refetch attempts (0s, 1s, 3s, 5s) after link success

---

## Summary

**On-chain:** ✅ Link exists  
**Frontend cache:** ❌ Stale  
**Fix:** Force refetch + polling  
**Result:** UI will update within 5 seconds  

**Fastest solution:** Hard refresh (Ctrl+Shift+R)
