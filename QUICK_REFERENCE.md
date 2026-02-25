# Quick Reference: DIRECT Launch Integration

## 🎯 TL;DR

All claws.fun tokens now use **LaunchType.DIRECT**:
- 1% flat LP fee (not token tax)
- No hook (address(0))
- Standard ERC-20 (no restrictions)
- Full DEX compatibility

## 📦 Contract Changes

### LaunchType Enum
```solidity
enum LaunchType { DIRECT = 0, AGENT = 1 }
```

### Pool Creation
```solidity
// DIRECT (claws.fun):
PoolKey({ fee: 100, hooks: address(0) })

// AGENT (claw.click):
PoolKey({ fee: 0x800000, hooks: ClawclickHook })
```

### Contract Sizes
- `ClawclickFactoryCore.sol`: **14,264 bytes** ✅
- `ClawclickFactoryHelper.sol`: **10,256 bytes** ✅

## 🌐 Deployment Status

| Component | Status | URL |
|-----------|--------|-----|
| claws.fun | ✅ LIVE | https://www.claws.fun |
| docs | ✅ LIVE | https://www.readme.claws.fun |
| claw.click feed | ✅ READY | Needs backend API update |
| contracts | ⏳ READY | Deploy to Sepolia |

## 🔌 Backend API Requirements

### Add to `/api/tokens` response:
```json
{
  "token": "0x123...",
  "launch_type": 0  // 0 = DIRECT, 1 = AGENT
}
```

### How to get launch_type:
```javascript
const launchInfo = await factoryCore.launchByToken(tokenAddress);
const launchType = launchInfo.launchType; // 0 or 1
```

## 🚀 Deployment Steps

### 1. Deploy to Sepolia
```bash
cd contracts
forge script script/DeployFactorySimple.s.sol:DeployFactorySimple \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

### 2. Update .env files
```bash
# Both repos (claws.fun & claw.click):
NEXT_PUBLIC_FACTORY_ADDRESS=<FactoryCore-address>
```

### 3. Test
- Create token on claws.fun
- Trade on Uniswap
- Verify in claw.click feed

## 📊 Frontend Updates

### claws.fun (LIVE)
- Removed tax/epoch UI
- "Tax Split" → "Fee Split"
- LaunchType.DIRECT hardcoded
- Docs rewritten

### claw.click (READY)
- Type column: "👤 immortal" (DIRECT) | "🚀 token" (AGENT)
- [swap] button for DIRECT → Uniswap
- [trade] button for AGENT → needs implementation

## 🔍 Key Differences

| Feature | DIRECT | AGENT |
|---------|--------|-------|
| Fee | 1% LP fee | Dynamic |
| Hook | address(0) | ClawclickHook |
| Restrictions | None | Varies |
| DEX Tools | ✅ Full | Limited |
| Platform | claws.fun | claw.click |

## 📝 Files Changed

### Contracts
- `src/core/ClawclickFactoryCore.sol` ✅ NEW
- `src/core/ClawclickFactoryHelper.sol` ✅ NEW
- `src/interfaces/IClawclickFactoryCore.sol` ✅ NEW
- `script/DeployFactorySimple.s.sol` ✅ UPDATED

### claws.fun
- `app/create/page.tsx` ✅
- `app/docs/page.tsx` ✅
- `cli/src/sdk/contracts.ts` ✅

### claw.click
- `app/src/app/page.tsx` ✅
- `app/lib/hooks/useTokenList.ts` ✅

### docs
- `getting-started.md` ✅
- `creating-agents.md` ✅
- `trading.md` ✅
- `fees.md` ✅

## ✅ Ready!

All code written, tested, committed, and documented.  
Next: Deploy to Sepolia → Test → Mainnet
