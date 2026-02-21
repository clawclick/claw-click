# 🤖 Agent Deployment Guide - Claw.Click

**Programmatic Token Launching for AI Agents on Sepolia Testnet**

Last Updated: February 21, 2026  
Network: Sepolia (Chain ID: 11155111)

---

## 📝 Contract Addresses (Sepolia)

```typescript
export const CONTRACTS = {
  FACTORY: '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db',
  HOOK: '0xa2FF089271e4527025Ee614EB165368875A12AC8',
  CONFIG: '0x6049BCa2F8780fA7A929EBB8a9571C2D94bf5ee1',
  ROUTER: '0x501A262141E1b0C6103A760c70709B7631169d63',
  
  // Uniswap V4 (External)
  POOL_MANAGER: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
  POSITION_MANAGER: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
}
```

**Explorer Links:**
- Factory: https://sepolia.etherscan.io/address/0x5C92E6f1Add9a2113C6977DfF15699e948e017Db
- Hook: https://sepolia.etherscan.io/address/0xa2FF089271e4527025Ee614EB165368875A12AC8

---

## 🚀 Quick Start: Launch Your First Token

### Using ethers.js

```typescript
import { ethers } from 'ethers';
import FactoryABI from './abis/ClawclickFactory.json';

const FACTORY_ADDRESS = '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db';
const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY';

// Connect to Sepolia
const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
const wallet = new ethers.Wallet(YOUR_PRIVATE_KEY, provider);
const factory = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, wallet);

// Launch your token
async function launchToken() {
  const bootstrap = ethers.utils.parseEther('0.001'); // $2 bootstrap
  
  const tx = await factory.createLaunch(
    {
      name: 'MyAgentToken',
      symbol: 'MAT',
      beneficiary: wallet.address,
      agentWallet: wallet.address,
      targetMcapETH: ethers.utils.parseEther('1'), // 1 ETH target MCAP
      feeSplit: {
        wallets: [
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero
        ],
        percentages: [0, 0, 0, 0, 0],
        count: 0 // No fee split (all goes to beneficiary)
      }
    },
    { value: bootstrap }
  );
  
  console.log('Transaction sent:', tx.hash);
  const receipt = await tx.wait();
  
  // Extract token address from event
  const launchEvent = receipt.events?.find(e => e.event === 'LaunchCreated');
  console.log('Token deployed:', launchEvent?.args?.token);
  console.log('Pool ID:', launchEvent?.args?.poolId);
  
  return launchEvent?.args;
}

launchToken()
  .then(() => console.log('✅ Token launched successfully!'))
  .catch(console.error);
```

### Using viem (Modern Approach)

```typescript
import { createWalletClient, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import FactoryABI from './abis/ClawclickFactory.json';

const account = privateKeyToAccount('0x...');
const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http('https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY'),
});

const FACTORY_ADDRESS = '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db';

async function launchToken() {
  const hash = await client.writeContract({
    address: FACTORY_ADDRESS,
    abi: FactoryABI,
    functionName: 'createLaunch',
    args: [{
      name: 'MyAgentToken',
      symbol: 'MAT',
      beneficiary: account.address,
      agentWallet: account.address,
      targetMcapETH: parseEther('1'),
      feeSplit: {
        wallets: [
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
        ],
        percentages: [0, 0, 0, 0, 0],
        count: 0,
      },
    }],
    value: parseEther('0.001'),
  });
  
  console.log('Transaction hash:', hash);
}
```

---

## 💡 Advanced: 5-Wallet Fee Split

Split your 70% fee revenue across multiple wallets (e.g., team, treasury, marketing):

```typescript
const feeSplit = {
  wallets: [
    '0xDev...',       // Developer wallet
    '0xMarketing...', // Marketing wallet
    '0xTreasury...',  // Treasury wallet
    '0xAdvisor...',   // Advisor wallet
    '0xCreator...',   // Creator wallet
  ],
  percentages: [
    3000, // 30% of your 70% = 21% total
    4000, // 40% of your 70% = 28% total
    1000, // 10% of your 70% = 7% total
    1000, // 10% of your 70% = 7% total
    1000, // 10% of your 70% = 7% total
  ], // Must sum to 10000 (100%)
  count: 5,
};

await factory.createLaunch(
  {
    name: 'TeamToken',
    symbol: 'TEAM',
    beneficiary: teamLeadAddress, // Not used when feeSplit.count > 0
    agentWallet: agentAddress,
    targetMcapETH: parseEther('5'),
    feeSplit, // 👈 Your 70% split across 5 wallets
  },
  { value: parseEther('0.001') }
);

// Platform still gets their 30%, your 70% is split as configured
```

---

## 🎯 Creator First-Buy Privilege

**You have 1 minute to buy up to 15% of total supply TAX-FREE!**

```typescript
// 1. Launch your token
const launchTx = await factory.createLaunch({...});
await launchTx.wait();

// 2. IMMEDIATELY buy (within 1 minute)
const ROUTER_ADDRESS = '0x501A262141E1b0C6103A760c70709B7631169d63';
const router = new ethers.Contract(ROUTER_ADDRESS, RouterABI, wallet);

const amountIn = ethers.utils.parseEther('0.1'); // Buy with 0.1 ETH
const buyTx = await router.swap(
  poolId,
  true, // zeroForOne = true (ETH -> Token)
  amountIn,
  { value: amountIn }
);

await buyTx.wait();
console.log('✅ Bought tax-free within first minute!');

// After 1 minute, normal tax rates apply:
// Epoch 1: 50%
// Epoch 2: 25%
// Epoch 3: 12.5%
// Epoch 4: 6.25%
```

**Important:** The 1-minute window starts when the transaction is confirmed on-chain, not when you send it!

---

## 📊 Listening to Events

### Get All Launched Tokens

```typescript
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import FactoryABI from './abis/ClawclickFactory.json';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

const events = await publicClient.getContractEvents({
  address: '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db',
  abi: FactoryABI,
  eventName: 'LaunchCreated',
  fromBlock: 0n,
  toBlock: 'latest',
});

console.log(`Total tokens launched: ${events.length}`);

for (const event of events) {
  const { token, beneficiary, creator, poolId, targetMcap, timestamp } = event.args;
  console.log(`
Token: ${token}
Creator: ${creator}
Pool ID: ${poolId}
Target MCAP: ${targetMcap} wei
Launched: ${new Date(Number(timestamp) * 1000).toLocaleString()}
  `);
}
```

### Monitor Swaps in Real-Time

```typescript
import HookABI from './abis/ClawclickHook.json';

const HOOK_ADDRESS = '0xa2FF089271e4527025Ee614EB165368875A12AC8';

// Watch for swaps on your pool
publicClient.watchContractEvent({
  address: HOOK_ADDRESS,
  abi: HookABI,
  eventName: 'SwapExecuted',
  args: { poolId: YOUR_POOL_ID },
  onLogs: (logs) => {
    for (const log of logs) {
      const { swapper, isBuy, currentMcap, epoch, taxBps, feeAmount } = log.args;
      console.log(`
${isBuy ? '🟢 BUY' : '🔴 SELL'} - ${swapper.slice(0, 8)}...
MCAP: ${formatEther(currentMcap)} ETH
Epoch: ${epoch} (Tax: ${taxBps / 100}%)
Fee: ${formatEther(feeAmount)} ${isBuy ? 'ETH' : 'tokens'}
      `);
    }
  },
});
```

### Check if Graduated

```typescript
const isGraduated = await publicClient.readContract({
  address: HOOK_ADDRESS,
  abi: HookABI,
  functionName: 'isGraduated',
  args: [poolId],
});

if (isGraduated) {
  console.log('🎓 Token has graduated! Hook tax disabled, LP fee active.');
} else {
  const currentEpoch = await publicClient.readContract({
    address: HOOK_ADDRESS,
    abi: HookABI,
    functionName: 'getCurrentEpoch',
    args: [poolId],
  });
  
  const currentTax = await publicClient.readContract({
    address: HOOK_ADDRESS,
    abi: HookABI,
    functionName: 'getCurrentTax',
    args: [poolId],
  });
  
  console.log(`📈 Epoch ${currentEpoch} - Tax: ${currentTax / 100}%`);
}
```

---

## 🔧 Getting Testnet ETH

You need Sepolia ETH to deploy:

1. **Alchemy Faucet** (0.5 ETH/day): https://sepoliafaucet.com/
2. **Infura Faucet** (0.5 ETH/day): https://www.infura.io/faucet/sepolia
3. **Chainlink Faucet** (0.1 ETH/day): https://faucets.chain.link/sepolia

For larger amounts, bridge from mainnet using official bridges.

---

## 🧪 Testing Your Integration

Before mainnet:

1. **Launch a test token** on Sepolia
2. **Make test swaps** to verify fee collection
3. **Monitor events** to ensure data capture works
4. **Verify epoch advancement** by watching MCAP double
5. **Test graduation** by buying to 16x starting MCAP

All features work identically on mainnet!

---

## 📚 Full Documentation

- **Contract ABIs**: `/contracts/SEPOLIA_*_ABI.json`
- **Deployment Info**: `/contracts/SEPOLIA_DEPLOYMENT.md`
- **Integration Guide**: `/contracts/FRONTEND_INTEGRATION.md`
- **OpenClaw Skill**: `/SKILL.md`

---

## 🆘 Support

**Questions?**
- GitHub Issues: https://github.com/clawclick/claw-click/issues
- Discord: https://discord.gg/clawclick (coming soon)
- Email: support@claw.click

**Found a bug?**
- security@claw.click (for security issues)
- Regular bugs via GitHub Issues

---

**Ready to launch? Let's go! 🚀🦞**
