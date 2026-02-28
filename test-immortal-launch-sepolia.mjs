// Test Immortal Token Launch on Sepolia - Feb 28 Deployment
import { createWalletClient, createPublicClient, http, parseEther, formatEther, encodeAbiParameters } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const SEPOLIA_CONTRACTS = {
  factory: '0xcBcbCC12664F3eE4D20b3F49554BBE55fD7d9746',
  bundler: '0x8112c14406C0f38C56f13A709498ddEd446a5b7b',
  birthCert: '0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132',
}

const DEPLOYER_WALLET = '0x0075f14030668b47b7f9d8b7a7fe173a96071129c9f0638aec02e74d4bcda65a'

const BUNDLER_ABI = [
  {
    name: 'launchAndMint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'launchParams',
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
      },
      { name: 'agentWallet', type: 'address' },
      { name: 'creator', type: 'address' },
      { name: 'agentName', type: 'string' },
      { name: 'socialHandle', type: 'string' },
      { name: 'memoryCID', type: 'string' },
      { name: 'avatarCID', type: 'string' },
      { name: 'ensName', type: 'string' },
    ],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'poolId', type: 'bytes32' },
      { name: 'nftId', type: 'uint256' },
    ],
  },
]

async function main() {
  console.log('🦞 Creating Immortal OpenClaw Agent Token on Sepolia')
  console.log('====================================================\n')

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
  const launchParams = {
    name: 'OpenClaw Agent',
    symbol: 'CLAW',
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
    launchType: 1, // AGENT type
  }

  const bootstrapETH = parseEther('0.001') // 0.001 ETH bootstrap

  console.log('🦞 Agent Details:')
  console.log('- Agent Name: OpenClaw Agent Feb28')
  console.log('- Token Name:', launchParams.name)
  console.log('- Token Symbol:', launchParams.symbol)
  console.log('- Social Handle: @openclaw_agent')
  console.log('- Target MCAP:', formatEther(launchParams.targetMcapETH), 'ETH')
  console.log('- Bootstrap ETH:', formatEther(bootstrapETH), 'ETH')
  console.log('- Launch Type: AGENT\n')

  console.log('Calling LaunchBundler.launchAndMint()...')
  console.log('Bundler:', SEPOLIA_CONTRACTS.bundler, '\n')

  try {
    const { request } = await publicClient.simulateContract({
      address: SEPOLIA_CONTRACTS.bundler,
      abi: BUNDLER_ABI,
      functionName: 'launchAndMint',
      args: [
        launchParams,
        account.address, // agentWallet
        account.address, // creator
        'OpenClaw Agent Feb28', // agentName
        '@openclaw_agent', // socialHandle
        'QmTestMemoryCID123', // memoryCID (placeholder)
        'QmTestAvatarCID123', // avatarCID (placeholder)
        '', // ensName (none)
      ],
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

    // Extract addresses from logs
    if (receipt.logs && receipt.logs.length > 0) {
      console.log('\n🎉 IMMORTAL AGENT CREATED!')
      console.log('Logs count:', receipt.logs.length)
      
      // Try to find token address from TokenLaunched event
      for (const log of receipt.logs) {
        if (log.topics && log.topics.length > 1) {
          const possibleToken = '0x' + log.topics[1].slice(26)
          console.log('Token Address:', possibleToken)
          console.log('Sepolia Etherscan:', `https://sepolia.etherscan.io/address/${possibleToken}`)
          break
        }
      }
      
      console.log('\n📜 Birth Certificate NFT:')
      console.log('Contract:', SEPOLIA_CONTRACTS.birthCert)
      console.log('Check for latest mint:', `https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.birthCert}#events`)
    }

    console.log('\n✅ IMMORTAL TOKEN CREATION COMPLETE')

  } catch (error) {
    console.error('❌ Launch failed:', error.message)
    if (error.cause) {
      console.error('Cause:', error.cause)
    }
    if (error.data) {
      console.error('Data:', error.data)
    }
    throw error
  }
}

main().catch(console.error)
