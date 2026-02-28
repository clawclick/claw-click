/**
 * Diagnose why the pool isn't accepting trades
 */

import { createPublicClient, http, formatEther } from 'viem'
import { sepolia } from 'viem/chains'

const TOKEN_ADDRESS = '0xd47253A11657aF5f4da04beD8d9c8184986200E0'
const FACTORY_ADDRESS = '0x3f4bFd32362D058157A5F43d7861aCdC0484C415'
const HOOK_ADDRESS = '0xf537a9356f6909df0A633C8BC48e504D2a30B111'

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
})

const FACTORY_ABI = [
  {
    name: 'getToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'beneficiary', type: 'address' },
          { name: 'agentWallet', type: 'address' },
          { name: 'poolId', type: 'bytes32' },
          { name: 'targetMcapETH', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'createdBlock', type: 'uint256' },
        ],
      },
    ],
  },
]

const HOOK_ABI = [
  {
    name: 'getPoolProgress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'currentEpoch', type: 'uint8' },
          { name: 'currentPosition', type: 'uint8' },
          { name: 'graduated', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getCurrentTax',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getCurrentLimits',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'maxTx', type: 'uint256' },
          { name: 'maxWallet', type: 'uint256' },
        ],
      },
    ],
  },
]

const ERC20_ABI = [
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
]

async function main() {
  console.log('\n🔍 === DIAGNOSING POOL === 🔍\n')
  console.log('Token:', TOKEN_ADDRESS, '\n')
  
  try {
    // Get token info from factory
    console.log('📊 Token Info from Factory:')
    const tokenInfo = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getToken',
      args: [TOKEN_ADDRESS],
    })
    
    console.log('   Name:', tokenInfo.name)
    console.log('   Symbol:', tokenInfo.symbol)
    console.log('   Beneficiary:', tokenInfo.beneficiary)
    console.log('   Agent Wallet:', tokenInfo.agentWallet)
    console.log('   Pool ID:', tokenInfo.poolId)
    console.log('   Target MCAP:', formatEther(tokenInfo.targetMcapETH), 'ETH')
    console.log('   Created At:', new Date(Number(tokenInfo.createdAt) * 1000).toISOString())
    console.log('   Created Block:', tokenInfo.createdBlock.toString())
    
    console.log('\n📈 Pool Progress:')
    const progress = await publicClient.readContract({
      address: HOOK_ADDRESS,
      abi: HOOK_ABI,
      functionName: 'getPoolProgress',
      args: [TOKEN_ADDRESS],
    })
    
    console.log('   Current Epoch:', progress.currentEpoch)
    console.log('   Current Position:', progress.currentPosition)
    console.log('   Graduated:', progress.graduated)
    
    console.log('\n💰 Current Tax:')
    const tax = await publicClient.readContract({
      address: HOOK_ADDRESS,
      abi: HOOK_ABI,
      functionName: 'getCurrentTax',
      args: [TOKEN_ADDRESS],
    })
    
    console.log('   Tax:', Number(tax) / 100, '%')
    
    console.log('\n📏 Current Limits:')
    const limits = await publicClient.readContract({
      address: HOOK_ADDRESS,
      abi: HOOK_ABI,
      functionName: 'getCurrentLimits',
      args: [TOKEN_ADDRESS],
    })
    
    console.log('   Max TX:', formatEther(limits.maxTx), 'tokens')
    console.log('   Max Wallet:', formatEther(limits.maxWallet), 'tokens')
    
    console.log('\n🪙 Total Supply:')
    const supply = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'totalSupply',
    })
    
    console.log('   Supply:', formatEther(supply), 'tokens')
    
    console.log('\n✅ All on-chain reads successful!')
    console.log('\n🤔 If pool reads work but trades fail, check:')
    console.log('   1. Is SwapExecutor approved/configured correctly?')
    console.log('   2. Does the hook allow trades through SwapExecutor?')
    console.log('   3. Is there liquidity in the pool?')
    console.log('   4. Try trading directly through the frontend')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    console.error('   Message:', error.shortMessage || error.message)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error.message)
    process.exit(1)
  })
