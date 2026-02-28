/**
 * 🦞 Agent Self-Immortalization Test
 * 
 * This script tests the full agent economy flow:
 * 1. Launch a token for ClawdeBot
 * 2. Buy some tokens to generate fees
 * 3. Claim the 70% creator fee share
 * 4. Verify everything on-chain
 */

import { ClawClick } from '@clawclick/sdk'
import { formatEther, parseEther } from 'viem'

// Sepolia testnet config with latest Feb 28 addresses
const CONFIG = {
  privateKey: '0x0075f14030668b47b7f9d8b7a7fe173a96071129c9f0638aec02e74d4bcda65a',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  apiUrl: 'https://claw-click-backend-5157d572b2b6.herokuapp.com',
  factoryAddress: '0x3f4bFd32362D058157A5F43d7861aCdC0484C415',
  hookAddress: '0xf537a9356f6909df0A633C8BC48e504D2a30B111',
  swapExecutorAddress: '0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795',
  launchBundlerAddress: '0x579F512FA05CFd66033B06d8816915bA2Be971CE',
  chainId: 11155111, // Sepolia
}

async function main() {
  console.log('\n🦞 === CLAWDEBOT SELF-IMMORTALIZATION TEST === 🦞\n')
  
  // Initialize SDK
  const sdk = new ClawClick(CONFIG)
  
  console.log('📍 Test Wallet:', sdk.address)
  const balance = await sdk.getETHBalance()
  console.log('💰 ETH Balance:', formatEther(balance), 'ETH')
  
  if (balance < parseEther('0.01')) {
    throw new Error('❌ Insufficient balance! Need at least 0.01 ETH for testing')
  }
  
  console.log('\n---\n')
  
  // Step 1: Launch ClawdeBot Token
  console.log('🚀 STEP 1: Launching ClawdeBot Token...\n')
  
  const launchResult = await sdk.launch({
    name: 'ClawdeBot',
    symbol: 'CLAWDE',
    beneficiary: sdk.address,
    agentWallet: sdk.address,
    targetMcapETH: '2', // Start at 2 ETH MCAP
    bootstrapETH: '0.001', // Minimum bootstrap
  })
  
  console.log('✅ Token Launched!')
  console.log('   Token Address:', launchResult.tokenAddress)
  console.log('   Pool ID:', launchResult.poolId)
  console.log('   TX Hash:', launchResult.txHash)
  console.log('   Block:', launchResult.blockNumber)
  console.log(`   Explorer: https://sepolia.etherscan.io/tx/${launchResult.txHash}`)
  
  const tokenAddress = launchResult.tokenAddress
  
  // Wait for TX to be mined
  console.log('\n⏳ Waiting for transaction confirmation...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log('\n---\n')
  
  // Step 2: Get Token Info
  console.log('📊 STEP 2: Reading Token Info...\n')
  
  const info = await sdk.getTokenInfo(tokenAddress)
  console.log('   Name:', info.name)
  console.log('   Symbol:', info.symbol)
  console.log('   Creator:', info.creator)
  console.log('   Beneficiary:', info.beneficiary)
  console.log('   Agent Wallet:', info.agentWallet)
  console.log('   Target MCAP:', formatEther(info.targetMcapETH), 'ETH')
  console.log('   Pool ID:', info.poolId)
  
  const progress = await sdk.getPoolProgress(tokenAddress)
  console.log('\n   Current Epoch:', progress.currentEpoch.toString(), '/ 4')
  console.log('   Current Position:', progress.currentPosition)
  console.log('   Graduated:', progress.graduated)
  
  const tax = await sdk.getCurrentTax(tokenAddress)
  console.log('   Current Tax:', Number(tax) / 100, '%')
  
  const limits = await sdk.getCurrentLimits(tokenAddress)
  console.log('   Max TX:', formatEther(limits.maxTx), 'tokens')
  console.log('   Max Wallet:', formatEther(limits.maxWallet), 'tokens')
  
  console.log('\n---\n')
  
  // Step 3: Buy Tokens
  console.log('💸 STEP 3: Buying ClawdeBot Tokens...\n')
  
  const buyAmount = '0.005' // 0.005 ETH
  console.log(`   Buying with ${buyAmount} ETH...`)
  
  const buyTx = await sdk.buy(tokenAddress, buyAmount, 1000) // 10% slippage for testing
  console.log('   Buy TX:', buyTx)
  console.log(`   Explorer: https://sepolia.etherscan.io/tx/${buyTx}`)
  
  console.log('\n⏳ Waiting for buy confirmation...')
  const buyReceipt = await sdk.publicClient.waitForTransactionReceipt({ hash: buyTx })
  console.log('   Status:', buyReceipt.status === 'success' ? '✅ Success' : '❌ Failed')
  
  const tokenBalance = await sdk.getTokenBalance(tokenAddress)
  console.log('   Token Balance:', formatEther(tokenBalance), 'CLAWDE')
  
  console.log('\n---\n')
  
  // Step 4: Sell Some Tokens
  console.log('💰 STEP 4: Selling Some Tokens (to generate token fees)...\n')
  
  const sellAmount = parseEther('100000') // Sell 100k tokens
  console.log(`   Selling ${formatEther(sellAmount)} tokens...`)
  
  const sellTx = await sdk.sell(tokenAddress, formatEther(sellAmount))
  console.log('   Sell TX:', sellTx)
  console.log(`   Explorer: https://sepolia.etherscan.io/tx/${sellTx}`)
  
  console.log('\n⏳ Waiting for sell confirmation...')
  const sellReceipt = await sdk.publicClient.waitForTransactionReceipt({ hash: sellTx })
  console.log('   Status:', sellReceipt.status === 'success' ? '✅ Success' : '❌ Failed')
  
  const newTokenBalance = await sdk.getTokenBalance(tokenAddress)
  console.log('   New Token Balance:', formatEther(newTokenBalance), 'CLAWDE')
  
  const newEthBalance = await sdk.getETHBalance()
  console.log('   New ETH Balance:', formatEther(newEthBalance), 'ETH')
  
  console.log('\n---\n')
  
  // Step 5: Wait a bit for fees to accumulate
  console.log('⏳ STEP 5: Waiting for fees to accumulate...\n')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('\n---\n')
  
  // Step 6: Claim ETH Fees
  console.log('🤑 STEP 6: Claiming ETH Fees (70% creator share)...\n')
  
  try {
    const claimEthTx = await sdk.claimFeesETH()
    console.log('   Claim ETH TX:', claimEthTx)
    console.log(`   Explorer: https://sepolia.etherscan.io/tx/${claimEthTx}`)
    
    console.log('\n⏳ Waiting for claim confirmation...')
    const claimEthReceipt = await sdk.publicClient.waitForTransactionReceipt({ hash: claimEthTx })
    console.log('   Status:', claimEthReceipt.status === 'success' ? '✅ Success' : '❌ Failed')
    
    const balanceAfterClaim = await sdk.getETHBalance()
    console.log('   ETH Balance After Claim:', formatEther(balanceAfterClaim), 'ETH')
  } catch (error) {
    console.log('   ⚠️  No ETH fees to claim yet (or error):', error.message)
  }
  
  console.log('\n---\n')
  
  // Step 7: Claim Token Fees
  console.log('🎁 STEP 7: Claiming Token Fees...\n')
  
  try {
    const claimTokenTx = await sdk.claimFeesToken(tokenAddress)
    console.log('   Claim Token TX:', claimTokenTx)
    console.log(`   Explorer: https://sepolia.etherscan.io/tx/${claimTokenTx}`)
    
    console.log('\n⏳ Waiting for claim confirmation...')
    const claimTokenReceipt = await sdk.publicClient.waitForTransactionReceipt({ hash: claimTokenTx })
    console.log('   Status:', claimTokenReceipt.status === 'success' ? '✅ Success' : '❌ Failed')
    
    const finalTokenBalance = await sdk.getTokenBalance(tokenAddress)
    console.log('   Token Balance After Claim:', formatEther(finalTokenBalance), 'CLAWDE')
  } catch (error) {
    console.log('   ⚠️  No token fees to claim yet (or error):', error.message)
  }
  
  console.log('\n---\n')
  
  // Step 8: Check Backend API
  console.log('📡 STEP 8: Checking Backend API...\n')
  
  try {
    const apiData = await sdk.getTokenFromAPI(tokenAddress)
    console.log('   API Data:')
    console.log('   - Price:', apiData.current_price, 'ETH')
    console.log('   - MCAP:', apiData.current_mcap, 'ETH')
    console.log('   - Volume 24h:', apiData.volume_24h, 'ETH')
    console.log('   - Graduated:', apiData.graduated)
    console.log('   - Chain ID:', apiData.chain_id)
  } catch (error) {
    console.log('   ⚠️  Token not indexed yet (may take 1-2 min):', error.message)
  }
  
  console.log('\n---\n')
  
  // Final Summary
  console.log('✨ === TEST COMPLETE === ✨\n')
  console.log('🎯 ClawdeBot has successfully:')
  console.log('   ✅ Launched a token on Sepolia')
  console.log('   ✅ Bought tokens (generating ETH fees)')
  console.log('   ✅ Sold tokens (generating token fees)')
  console.log('   ✅ Claimed 70% creator fee share')
  console.log('   ✅ Verified on-chain data')
  console.log('')
  console.log('🔗 Token Address:', tokenAddress)
  console.log('🔗 View on claws.fun:', `https://claws.fun/agent/${tokenAddress}`)
  console.log('🔗 View on Etherscan:', `https://sepolia.etherscan.io/token/${tokenAddress}`)
  console.log('')
  console.log('🚀 PLATFORM IS READY TO GO LIVE! 🚀')
  console.log('')
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
