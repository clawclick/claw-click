# Creator First-Buy Privilege

## 🎯 Overview

Token creators have a **1-minute window** after launch to buy up to **15% of supply** with **zero tax** and **no limits**.

---

## ⏱️ How It Works

### Automatic Detection

The hook automatically detects creator first-buy:

```solidity
bool isCreatorFirstBuy = (
    tx.origin == launchInfo.creator &&              // Must be creator wallet
    block.timestamp < launchInfo.createdAt + 1 minutes &&  // Within 1 minute
    params.zeroForOne                                // Must be a buy (ETH → Token)
);

// If true, bypass all restrictions
if (isCreatorFirstBuy) {
    return (BaseHook.beforeSwap.selector, toBeforeSwapDelta(0, 0), 0);
}
```

### Timeline

```
Launch (t=0)
│
├─ 0-60 seconds: Creator can buy up to 15% tax-free
│                 • No hook tax
│                 • No transaction limits
│                 • No wallet limits
│
└─ After 60 seconds: Normal rules apply
                     • Hook tax active (50% → 25% → 12.5%...)
                     • Transaction limits enforced
                     • Wallet limits enforced
```

---

## 🔒 Safety Guarantees

### 1. Supply Cap
```solidity
uint256 public constant MAX_DEV_SUPPLY_BPS = 1500;  // 15%
```
Creator cannot exceed 15% even during privilege window.

### 2. Time Lock
Window **automatically expires** after 1 minute. No need for manual intervention.

### 3. Direction Lock
Only **buys** (ETH → Token) are privileged. Sells always have normal rules.

### 4. Wallet Lock
Only the **original creator** wallet (stored at launch) gets privilege.

---

## 🛠️ Usage Example

### For Creators

```typescript
// 1. Launch your token
const txLaunch = await factory.createLaunch(
    {
        name: "My Token",
        symbol: "MTK",
        beneficiary: creatorAddress,
        agentWallet: creatorAddress,
        targetMcapETH: ethers.utils.parseEther("5")
    },
    { value: ethers.utils.parseEther("0.001") }  // $2 bootstrap
);

const receipt = await txLaunch.wait();
console.log("Token launched! You have 1 minute...");

// 2. Buy immediately (tax-free up to 15%)
const poolKey = buildPoolKey(tokenAddress);
const buyAmount = ethers.utils.parseEther("0.1");  // Example: 0.1 ETH buy

const txBuy = await router.buy(poolKey, buyAmount, {
    value: buyAmount
});

await txBuy.wait();
console.log("Bought 15% tax-free!");

// 3. After 1 minute, privilege expires automatically
// No need to call clearDevOverride() unless you want to ensure cleanup
```

### Manual Cleanup (Optional)

```typescript
// After 1 minute, you can manually clear the override
// (though it auto-expires anyway)
await factory.clearDevOverride(poolId);
```

---

## 📊 Comparison

| | **Creator (First Minute)** | **Regular Trader** |
|---|---|---|
| **Tax** | 0% | 50% → 25% → 12.5%... |
| **Max TX** | No limit (up to 15% total) | 2% → 4% → 8%... |
| **Max Wallet** | No limit (up to 15% total) | 10% → 20% → 40%... |
| **Window** | 1 minute | Anytime |

---

## 🔍 Verification

Anyone can verify creator hasn't exceeded cap:

```solidity
function checkDevCap(PoolId poolId, address devAddress) 
    external 
    view 
    returns (bool) 
{
    address token = poolStates[poolId].token;
    uint256 devBalance = ClawclickToken(token).balanceOf(devAddress);
    uint256 maxDevTokens = (TOTAL_SUPPLY * MAX_DEV_SUPPLY_BPS) / BPS;
    return devBalance <= maxDevTokens;  // True if within cap
}
```

---

## ⚠️ Edge Cases

### What if creator buys after 1 minute?
Normal rules apply. They pay hook tax like everyone else.

### What if creator sells during first minute?
Normal rules apply. Only **buys** are privileged.

### What if creator tries to buy more than 15%?
Transaction succeeds for the first 15%, but they can't buy more (wallet limit enforcement).

### What if creator transfers to another wallet then buys?
New wallet is NOT privileged. Only the original creator wallet address.

---

## 🎯 Why This Design?

1. **Fair Launch** - Creators can establish initial liquidity position
2. **Anti-Sniper** - Hook tax protects against bots, but not creator
3. **Time-Bounded** - Short window prevents abuse
4. **Supply-Capped** - 15% ensures no majority control
5. **Transparent** - All on-chain, verifiable by anyone

---

## 🔗 Related Functions

- `ClawclickFactory.clearDevOverride(PoolId)` - Manual cleanup after 1 minute
- `ClawclickFactory.checkDevCap(PoolId, address)` - Verify 15% cap
- `ClawclickHook.setActivationInProgress(PoolId, bool)` - Internal override flag

---

**Implementation:** `ClawclickHook_V4.sol` lines 475-485  
**Factory Function:** `ClawclickFactory.sol` lines 835-856  
**Verification:** `ClawclickFactory.sol` lines 858-868
