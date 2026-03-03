const { ClawClick } = require('./dist/index.js');
const { formatEther } = require('viem');

async function main() {
  const sdk = new ClawClick({
    privateKey: '0x0075f14030668b47b7f9d8b7a7fe173a96071129c9f0638aec02e74d4bcda65a',
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/demo',
    apiUrl: 'https://claw-click-backend-5157d572b2b6.herokuapp.com',
    factoryAddress: '0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a',
    hookAddress: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    poolSwapTestAddress: '0xBbB04538530970f3409e3844bF99475b5324912e',
    chainId: 8453,
  });

  console.log('🦞 Claw.Click Fee Claim Report');
  console.log('=====================================\n');
  console.log('Wallet:', sdk.address);
  
  const tokenAddress = '0x028b02C7a8c7a9cc042647271356fd29A7D1c5B3';
  
  console.log('\n📊 Token:', tokenAddress);
  
  // Get token info
  const info = await sdk.getTokenInfo(tokenAddress);
  console.log('Name:', info.name);
  console.log('Symbol:', info.symbol);
  console.log('Target MCAP:', formatEther(info.targetMcapETH), 'ETH');
  
  console.log('\n💰 Fee Split:');
  if (info.feeSplit && info.feeSplit.count > 0) {
    for (let i = 0; i < info.feeSplit.count; i++) {
      console.log(`  ${i + 1}. ${info.feeSplit.wallets[i]} → ${info.feeSplit.percentages[i] / 100}%`);
    }
  }
  
  // Check accumulated fees
  console.log('\n🔍 Checking accumulated fees...');
  
  const hookAbi = [
    {
      name: 'beneficiaryFeesETH',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'beneficiary', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      name: 'beneficiaryFeesToken',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'beneficiary', type: 'address' },
        { name: 'token', type: 'address' }
      ],
      outputs: [{ name: '', type: 'uint256' }],
    }
  ];
  
  // Wallet 1: 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7
  console.log('\nWallet 1 (0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7):');
  const ethFees1 = await sdk.publicClient.readContract({
    address: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    abi: hookAbi,
    functionName: 'beneficiaryFeesETH',
    args: ['0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7'],
  });
  console.log('  ETH Fees:', formatEther(ethFees1), 'ETH');
  
  const tokenFees1 = await sdk.publicClient.readContract({
    address: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    abi: hookAbi,
    functionName: 'beneficiaryFeesToken',
    args: ['0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7', tokenAddress],
  });
  console.log('  Token Fees:', formatEther(tokenFees1), info.symbol);
  
  // Wallet 2: 0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079
  console.log('\nWallet 2 (0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079):');
  const ethFees2 = await sdk.publicClient.readContract({
    address: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    abi: hookAbi,
    functionName: 'beneficiaryFeesETH',
    args: ['0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079'],
  });
  console.log('  ETH Fees:', formatEther(ethFees2), 'ETH');
  
  const tokenFees2 = await sdk.publicClient.readContract({
    address: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    abi: hookAbi,
    functionName: 'beneficiaryFeesToken',
    args: ['0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079', tokenAddress],
  });
  console.log('  Token Fees:', formatEther(tokenFees2), info.symbol);
  
  // Claim fees for wallet 1 (current signer)
  console.log('\n🎯 Claiming fees for Wallet 1...\n');
  
  if (ethFees1 > 0n) {
    console.log(`Claiming ${formatEther(ethFees1)} ETH...`);
    try {
      const claimEthTx = await sdk.claimFeesETH();
      console.log('TX Hash:', claimEthTx);
      console.log('Waiting for confirmation...');
      const receipt = await sdk.publicClient.waitForTransactionReceipt({ hash: claimEthTx });
      console.log('✅ ETH fees claimed!');
      console.log('Status:', receipt.status);
      console.log('BaseScan: https://basescan.org/tx/' + claimEthTx);
    } catch (e) {
      console.error('❌ Error:', e.message);
    }
  } else {
    console.log('ℹ️  No ETH fees to claim');
  }
  
  if (tokenFees1 > 0n) {
    console.log(`\nClaiming ${formatEther(tokenFees1)} ${info.symbol}...`);
    try {
      const claimTokenTx = await sdk.claimFeesToken(tokenAddress);
      console.log('TX Hash:', claimTokenTx);
      console.log('Waiting for confirmation...');
      const receipt = await sdk.publicClient.waitForTransactionReceipt({ hash: claimTokenTx });
      console.log('✅ Token fees claimed!');
      console.log('Status:', receipt.status);
      console.log('BaseScan: https://basescan.org/tx/' + claimTokenTx);
    } catch (e) {
      console.error('❌ Error:', e.message);
    }
  } else {
    console.log('ℹ️  No token fees to claim');
  }
  
  console.log('\n=====================================');
  console.log('✅ Complete!');
  console.log('=====================================\n');
}

main().catch(console.error);
