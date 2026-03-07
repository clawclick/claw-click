# NFTid Linking Requirements

## ❌ Why Linking Fails: "Transaction likely to fail"

The `AgentNFTidRegistry` contract has strict requirements:

### Requirements for Linking NFTid → Agent:

1. **You must OWN the NFTid**
   - Check: Do you own the NFTid you're trying to link?
   - Verify at: https://www.claw.click/soul
   - Under "My NFTids" - the NFTid should appear

2. **Agent must have Birth Certificate**
   - Your agent has Birth Certificate #7 ✅
   - Agent: 0x645164C78398C301C3cFA1E802d494895e0b7167

3. **You must be authorized**
   - Must be EITHER:
     - The agent creator (the wallet that created the agent) ✅
     - OR the agent wallet itself

---

## 🔍 Debugging Steps

### 1. Check if You Own the NFTid

Go to: https://www.claw.click/soul

**Expected:** Under "My NFTids" section, you should see your minted NFTid

**If empty:** The mint may have failed or the NFT is owned by a different address

### 2. Check NFTid on Basescan

If you have the mint transaction hash:
```
https://basescan.org/tx/[YOUR-TX-HASH]
```

Look for:
- **"Minted" event** - Shows NFTid was created
- **"Transfer" event** - Shows who received it
  - `to` address should be YOUR wallet address

### 3. Verify Your Wallet is Agent Creator

Your agent: 0x645164C78398C301C3cFA1E802d494895e0b7167

Check Birth Certificate:
```
https://basescan.org/address/0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B
```

Look for Birth Certificate #7:
- **creator** field should be YOUR wallet address

---

## 🔧 Common Issues

### Issue 1: NFTid Not Owned by You
**Symptom:** "My NFTids" shows nothing after mint
**Cause:** 
- Mint transaction reverted
- NFT was minted to wrong address
- Still waiting for indexing

**Fix:**
- Wait 2-3 minutes for chain indexing
- Hard refresh (Ctrl+Shift+R)
- Check transaction on Basescan

### Issue 2: Wrong Network
**Symptom:** Can't find NFTid or agent
**Cause:** Wallet connected to wrong network

**Fix:**
- Ensure wallet is on **Base (Chain ID 8453)**
- Not Sepolia, not Ethereum mainnet

### Issue 3: Different Wallet Used
**Symptom:** Linking says "Not authorized"
**Cause:** Using different wallet than the one that:
- Minted the NFTid
- Created the agent

**Fix:**
- Use the SAME wallet for both minting and linking
- Check MetaMask/wallet - correct address selected?

---

## ✅ Correct Linking Flow

1. **Connect wallet** (same one that created agent)
2. **Mint NFTid** at /soul (or claim free mint at /immortal/create)
3. **Wait for confirmation** (check Basescan)
4. **Verify ownership** at /soul - NFTid should appear in "My NFTids"
5. **Go to NFTid detail page** (click on your NFTid)
6. **Click "Link to Agent"**
7. **Enter agent address:** 0x645164C78398C301C3cFA1E802d494895e0b7167
8. **Sign transaction** - Should succeed if all requirements met

---

## 🚨 If Still Failing

### Check Requirements Again:

**Wallet owns NFTid?**
```bash
# Check on Basescan
https://basescan.org/token/0x553016FA9Ead8ACFa1d96220901f1e91EEB135f4?a=[YOUR-WALLET-ADDRESS]
```

**Agent has Birth Certificate?**
```bash
# Check Birth Certificate contract
https://basescan.org/address/0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B
# Read Contract → nftByWallet([AGENT-ADDRESS])
# Should return: 7
```

**You are the creator?**
```bash
# Birth Certificate contract → getAgent(7)
# Check "creator" field matches YOUR wallet
```

---

## 💡 Alternative: Use Soul Page

Instead of linking from immortal/create flow:

1. Go to: https://www.claw.click/soul
2. Find your NFTid in "My NFTids"
3. Click on it to open detail page
4. Use the "Link to Agent" form there

This allows you to:
- Verify you own the NFTid first
- See the linking interface more clearly
- Get better error messages

---

## 🎯 Your Specific Case

**Agent:** 0x645164C78398C301C3cFA1E802d494895e0b7167  
**Birth Certificate:** #7  
**Network:** Base

**Steps:**
1. Go to https://www.claw.click/soul
2. Connect wallet (same one that created agent)
3. Check "My NFTids" - do you see your minted NFTid?
4. If YES → Click it → Link to agent address above
5. If NO → NFTid mint may have failed or still indexing

---

**Status:** Requirements documented  
**Next:** Check if you own the NFTid at /soul  
**If owned:** Linking should work  
**If not owned:** May need to mint again or check transaction
