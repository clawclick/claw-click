# Dev Buy Implementation Guide

## 🎯 Status: READY TO IMPLEMENT

The two-transaction dev buy flow has been prepared. Here's exactly what needs to happen:

## ✅ Changes Made

1. **Created `useLaunchWithDevBuy` hook** (`lib/hooks/useLaunchWithDevBuy.ts`)
   - Handles TX1 (launch) + TX2 (dev buy) atomically
   - Works for both DIRECT and AGENT flows
   - Uses PoolSwapTest router for universal swap compatibility

2. **Updated contract addresses** (`app/lib/contracts/index.ts`)
   - Added `poolSwapTest` addresses for both Sepolia and Base
   - Sepolia: `0x449F992c283d7641c6D0c06C6517396992ca29d7`
   - Base: `0xBbB04538530970f3409e3844bF99475b5324912e`

3. **PoolSwapTest ABI** already exists in contracts file ✅

## 📋 Remaining Integration Steps

### 1. Update `app/create/page.tsx`

Replace the current `handleCreateAgent` function (around line 195) with:

```tsx
import { useLaunchWithDevBuy } from '../../lib/hooks/useLaunchWithDevBuy'

// Inside CreateAgentFlow component:
const chainId = connectedChain?.id || 8453
const isSepolia = chainId === 11155111
const addresses = isSepolia ? SEPOLIA_ADDRESSES : BASE_ADDRESSES

const { 
  launchWithDevBuy,
  isLaunching,
  phase,
  error: launchError,
  result,
  reset: resetLaunch
} = useLaunchWithDevBuy(
  addresses.clawclick.factory as `0x${string}`,
  addresses.clawclick.bundler as `0x${string}`,
  addresses.clawclick.poolSwapTest as `0x${string}`
)

const handleCreateAgent = async () => {
  if (!isConnected || !creatorAddress || !agentWallet) {
    alert('Please connect your wallet first')
    return
  }

  if (!formData.name || !formData.symbol) {
    alert('Please fill in all required fields')
    return
  }

  setDeployError(null)

  try {
    // Build params
    const devBuyAmount = (formData.genesisBuy * formData.devBuyPercent) / 100
    
    const launchParams: LaunchParams = {
      name: formData.name,
      symbol: formData.symbol,
      beneficiary: creatorAddress,
      agentWallet: creatorType === 'agent' ? agentWallet : ethers.ZeroAddress,
      targetMcapETH: parseEther(formData.genesisBuy.toString()),
      feeSplit: {
        wallets: buildFeeSplitWallets(), // existing logic
        percentages: buildFeeSplitPercentages(), // existing logic
        count: walletCount
      },
      launchType: LaunchType.DIRECT, // claws.fun always DIRECT
      devBuyETH: devBuyAmount > 0 ? devBuyAmount : undefined,
      // AGENT-specific
      agentName: formData.name,
      socialHandle: '',
      memoryCID: memoryCID || '',
      avatarCID: '',
      ensName: '',
    }

    const result = await launchWithDevBuy(launchParams)
    
    if (result) {
      setLaunchedToken(result.tokenAddress)
      setLaunchedPoolId(result.poolId)
      setBirthCertNftId(result.nftId)
      setDeployPhase('done')
    }
  } catch (error: any) {
    console.error('[Deploy] Failed:', error)
    setDeployError(error?.message || 'Unknown error')
    setDeployPhase('idle')
  }
}
```

### 2. Update deployment phase UI

Update the deployment modal to show two transaction states:

```tsx
{deployPhase === 'launching' && (
  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
    <p className="text-sm text-blue-400">⏳ Transaction 1/2: Launching token...</p>
    <p className="text-xs text-[#8FA3B8]">Waiting for wallet confirmation...</p>
  </div>
)}

{deployPhase === 'waiting-tx1' && (
  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
    <p className="text-sm text-blue-400">⏳ Transaction 1/2: Confirming launch...</p>
    <p className="text-xs text-[#8FA3B8]">Waiting for blockchain confirmation...</p>
  </div>
)}

{deployPhase === 'buying' && formData.devBuyPercent > 0 && (
  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
    <p className="text-sm text-green-400">✅ Token launched!</p>
    <p className="text-sm text-blue-400">⏳ Transaction 2/2: Buying tokens...</p>
    <p className="text-xs text-[#8FA3B8]">Executing dev buy (0% tax in first minute)</p>
  </div>
)}

{deployPhase === 'waiting-tx2' && formData.devBuyPercent > 0 && (
  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
    <p className="text-sm text-blue-400">⏳ Transaction 2/2: Confirming buy...</p>
    <p className="text-xs text-[#8FA3B8]">Waiting for blockchain confirmation...</p>
  </div>
)}

{deployPhase === 'done' && (
  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
    <p className="text-sm text-green-400">✅ All transactions confirmed!</p>
    {formData.devBuyPercent > 0 && (
      <p className="text-xs text-[#8FA3B8]">Dev buy: {formData.devBuyPercent}% of supply purchased</p>
    )}
  </div>
)}
```

## 🔧 How It Works

### Current Flow (Broken):
```
User sends: 0.035 ETH
  └─> TX1: Launch (0.03 ETH bootstrap + 0.005 ETH birth cert)
  └─> ❌ No dev buy!
  └─> Creator gets: 0 tokens
```

### New Flow (Fixed):
```
User sends: 0.035 ETH total intent
  └─> TX1: Launch (0.001 ETH bootstrap + 0.005 ETH = 0.006 ETH)
       ✅ Token created
       ✅ Pool initialized
       ✅ Birth certificate minted
  
  └─> TX2: Dev Buy (0.029 ETH via PoolSwapTest)
       ✅ Executes within 1-minute creator window
       ✅ 0% tax (AGENT) or 1% LP fee (DIRECT)
       ✅ Creator receives ~15% of supply
```

## 💰 Cost Breakdown

### CLAWS.FUN (DIRECT):
```
User input: 0.05 ETH total
  ├─> TX1: 0.001 ETH (bootstrap LP)
  └─> TX2: 0.049 ETH (buy tokens)
      Fee: 1% LP fee = ~0.00049 ETH
      Receive: ~49 ETH worth of tokens (at starting price)
```

### CLAW.CLICK (AGENT):
```
User input: 0.035 ETH total
  ├─> TX1: 0.006 ETH (0.001 bootstrap + 0.005 birth cert)
  └─> TX2: 0.029 ETH (buy tokens)
      Fee: 0% (creator first-buy window!)
      Receive: ~29 ETH worth of tokens = ~15% of supply
```

## 🚀 Deployment Checklist

- [x] Create `useLaunchWithDevBuy` hook
- [x] Update contract addresses
- [x] Verify PoolSwapTest ABI exists
- [ ] Update `app/create/page.tsx` to use new hook
- [ ] Update deployment phase UI
- [ ] Test on Sepolia
- [ ] Deploy to production (claws.fun + claw.click)

## 🧪 Testing Steps

1. Launch token on Sepolia with 10% dev buy
2. Verify TX1 creates token + pool
3. Verify TX2 executes buy and creator receives tokens
4. Check creator token balance matches expected amount
5. Verify fees are split correctly (30/70 for DIRECT, 70/30 for AGENT in P1)

## 📝 Notes

- **Creator first-buy window:** 1 minute from launch (0% tax for AGENT)
- **Dev buy limit:** 0-15% of supply max
- **Bootstrap ETH:** Always 0.001 ETH (MIN_BOOTSTRAP_ETH)
- **Birth cert fee:** 0.005 ETH (AGENT only)
- **PoolSwapTest:** Universal router, works for both DIRECT and AGENT

## ⚠️ Important

The hook automatically uses `tx.origin` for creator detection, so the dev buy MUST come from the same wallet that launched the token. This is enforced by the Hook contract's creator first-buy logic.
