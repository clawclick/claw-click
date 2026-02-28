// Test Token Launch on Sepolia - Feb 28 Deployment
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const SEPOLIA_CONTRACTS = {
  factory: '0xcBcbCC12664F3eE4D20b3F49554BBE55fD7d9746',
  hook: '0x64f7cC79F599efBc8e95978520c5092Ef8DE2AC8',
  config: '0xD1D3059569548cB51FF26Eb65Eb45dd13AD2Bf50',
  bootstrapETH: '0xe3893b4c3a210571d04561714eFDAd34F80Bc232',
  poolManager: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
}

const DEPLOYER_WALLET = '0x0075f14030668b47b7f9d8b7a7fe173a96071129c9f0638aec02e74d4bcda65a'

const FACTORY_ABI = [
  {
    name: 'createLaunch',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'name', type: 'string' },
        { name: 'symbol', type: 'string' },
        { name: 'beneficiary', type: 'address' },
        { name: 'agentWallet', type: 'address' },
        { name: 'targetMcapETH', type: 'uint256' },
        { 
          name: 'feeSplit', 
          type: 'tuple',
          components: [
            { name: 'wallets', type: 'address[5]' },
            { name: 'percentages', type: 'uint16[5]' },
            { name: 'count', type: 'uint8' },
          ]
        },
        { name: 'launchType', type: 'uint8' },
      ],
    }],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'poolId', type: 'bytes32' },
    ],
  },
]

async function main() {
  console.log('🚀 Launching Test Token on Sepolia (Feb 28 Deployment)')
  console.log('================================================\n')

  const account = privateKeyToAccount(DEPLOYER_WALLET)
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com')
  })
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com')
  })

  console.log('Deployer:', account.address)
  
  const balance = await publicClient.getBalance({ address: account.address })
  console.log('Balance:', formatEther(balance), 'ETH\n')

  if (balance < parseEther('0.01')) {
    throw new Error('❌ Insufficient balance! Need at least 0.01 ETH for gas + bootstrap')
  }

  // Launch parameters
  const params = {
    name: 'Test Token Feb28',
    symbol: 'TEST28',
    beneficiary: account.address,
    agentWallet: account.address,
    targetMcapETH: parseEther('2'), // 2 ETH starting MCAP
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
    launchType: 0, // DIRECT
  }

  const bootstrapETH = parseEther('0.001') // 0.001 ETH bootstrap

  console.log('Launch Parameters:')
  console.log('- Name:', params.name)
  console.log('- Symbol:', params.symbol)
  console.log('- Beneficiary:', params.beneficiary)
  console.log('- Target MCAP:', formatEther(params.targetMcapETH), 'ETH')
  console.log('- Bootstrap ETH:', formatEther(bootstrapETH), 'ETH')
  console.log('- Launch Type: DIRECT\n')

  console.log('Calling Factory.createLaunch()...')
  console.log('Factory:', SEPOLIA_CONTRACTS.factory, '\n')

  try {
    const { request } = await publicClient.simulateContract({
      address: SEPOLIA_CONTRACTS.factory,
      abi: FACTORY_ABI,
      functionName: 'createLaunch',
      args: [params],
      value: bootstrapETH,
      account,
    })

    const hash = await walletClient.writeContract(request)
    console.log('✅ Transaction submitted!')
    console.log('TX Hash:', hash)
    console.log('Waiting for confirmation...\n')

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('✅ Transaction confirmed!')
    console.log('Block:', receipt.blockNumber)
    console.log('Gas Used:', receipt.gasUsed.toString())
    console.log('Status:', receipt.status === 'success' ? '✅ SUCCESS' : '❌ FAILED')

    // Extract token address from logs
    if (receipt.logs && receipt.logs.length > 0) {
      // TokenLaunched event should be first log
      const tokenLaunchedLog = receipt.logs[0]
      if (tokenLaunchedLog.topics && tokenLaunchedLog.topics.length > 1) {
        const tokenAddress = '0x' + tokenLaunchedLog.topics[1].slice(26)
        console.log('\n🎉 Token Launched!')
        console.log('Token Address:', tokenAddress)
        console.log('Sepolia Etherscan:', `https://sepolia.etherscan.io/address/${tokenAddress}`)
      }
    }

    console.log('\n✅ TEST TOKEN LAUNCH COMPLETE')

  } catch (error) {
    console.error('❌ Launch failed:', error.message)
    if (error.cause) {
      console.error('Cause:', error.cause)
    }
    throw error
  }
}

main().catch(console.error)
