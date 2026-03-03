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
    chainId: 8453, // Base Mainnet
  });

  console.log('Wallet:', sdk.address);
  
  // Get transaction receipt to find token address
  console.log('\n📋 Fetching launch transaction...');
  const receipt = await sdk.publicClient.getTransactionReceipt({
    hash: '0x2e69d8fd9e3fe3d7bc9cbf65900019942cc8985f1a6dc7abe39951910adb6718'
  });
  
  // Find TokenLaunched event
  const factoryAbi = [
    {
      anonymous: false,
      name: 'TokenLaunched',
      type: 'event',
      inputs: [
        { indexed: true, name: 'token', type: 'address' },
        { indexed: true, name: 'beneficiary', type: 'address' },
        { indexed: true, name: 'creator', type: 'address' },
        { indexed: false, name: 'poolId', type: 'bytes32' },
        { indexed: false, name: 'targetMcapETH', type: 'uint256' },
        { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
        { indexed: false, name: 'name', type: 'string' },
        { indexed: false, name: 'symbol', type: 'string' },
        { indexed: false, name: 'launchType', type: 'uint8' },
      ],
    }
  ];
  
  const { decodeEventLog } = require('viem');
  let tokenAddress = null;
  let poolId = null;
  
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: factoryAbi,
        data: log.data,
        topics: log.topics,
      });
      
      if (decoded.eventName === 'TokenLaunched') {
        tokenAddress = decoded.args.token;
        poolId = decoded.args.poolId;
        console.log('✅ Token Address:', tokenAddress);
        console.log('✅ Pool ID:', poolId);
        console.log('✅ Creator:', decoded.args.creator);
        console.log('✅ Beneficiary:', decoded.args.beneficiary);
        break;
      }
    } catch (e) {
      // Not this event
    }
  }
  
  if (!tokenAddress) {
    console.error('❌ Could not find token address in launch transaction');
    return;
  }
  
  // Get token info
  console.log('\n📊 Token Info:');
  const info = await sdk.getTokenInfo(tokenAddress);
  console.log('Name:', info.name);
  console.log('Symbol:', info.symbol);
  console.log('Creator:', info.creator);
  console.log('Beneficiary:', info.beneficiary);
  console.log('Target MCAP:', formatEther(info.targetMcapETH), 'ETH');
  console.log('Fee Split:', info.feeSplit);
  
  // Check if there's a fee split
  if (info.feeSplit && info.feeSplit.count > 0) {
    console.log('\n💰 Fee Split Configuration:');
    for (let i = 0; i < info.feeSplit.count; i++) {
      console.log(`  Wallet ${i + 1}:`, info.feeSplit.wallets[i]);
      console.log(`  Percentage: ${info.feeSplit.percentages[i] / 100}%`);
    }
  }
  
  // Get pool progress
  console.log('\n📈 Pool Progress:');
  const progress = await sdk.getPoolProgress(tokenAddress);
  console.log('Current Epoch:', progress.currentEpoch.toString());
  console.log('Current Position:', progress.currentPosition.toString());
  console.log('Graduated:', progress.graduated);
  
  // Get current tax and limits
  console.log('\n💸 Current Tax & Limits:');
  const tax = await sdk.getCurrentTax(tokenAddress);
  console.log('Tax:', Number(tax) / 100, '%');
  
  const limits = await sdk.getCurrentLimits(tokenAddress);
  console.log('Max TX:', formatEther(limits.maxTx), 'tokens');
  console.log('Max Wallet:', formatEther(limits.maxWallet), 'tokens');
  
  // Check hook contract for accumulated fees
  console.log('\n🔍 Checking accumulated fees in Hook contract...');
  
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
  
  // Check fees for wallet 1 (0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7)
  console.log('\n💰 Fees for Wallet 1 (0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7):');
  const ethFees1 = await sdk.publicClient.readContract({
    address: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    abi: hookAbi,
    functionName: 'beneficiaryFeesETH',
    args: ['0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7'],
  });
  console.log('ETH Fees Available:', formatEther(ethFees1), 'ETH');
  
  const tokenFees1 = await sdk.publicClient.readContract({
    address: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    abi: hookAbi,
    functionName: 'beneficiaryFeesToken',
    args: ['0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7', tokenAddress],
  });
  console.log('Token Fees Available:', formatEther(tokenFees1), info.symbol);
  
  // Check fees for wallet 2 (0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079)
  console.log('\n💰 Fees for Wallet 2 (0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079):');
  const ethFees2 = await sdk.publicClient.readContract({
    address: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    abi: hookAbi,
    functionName: 'beneficiaryFeesETH',
    args: ['0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079'],
  });
  console.log('ETH Fees Available:', formatEther(ethFees2), 'ETH');
  
  const tokenFees2 = await sdk.publicClient.readContract({
    address: '0x8265be7eb9D7e40c1FAb6CBd8DBc626b31A0aac8',
    abi: hookAbi,
    functionName: 'beneficiaryFeesToken',
    args: ['0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079', tokenAddress],
  });
  console.log('Token Fees Available:', formatEther(tokenFees2), info.symbol);
  
  // Now claim fees for wallet 1 (current signer)
  console.log('\n🎯 Attempting to claim fees for wallet 1...');
  
  if (ethFees1 > 0n) {
    console.log('Claiming ETH fees...');
    try {
      const claimEthTx = await sdk.claimFeesETH();
      console.log('Claim ETH TX:', claimEthTx);
      const receipt = await sdk.publicClient.waitForTransactionReceipt({ hash: claimEthTx });
      console.log('✅ ETH fees claimed! Status:', receipt.status);
      console.log('View on BaseScan: https://basescan.org/tx/' + claimEthTx);
    } catch (e) {
      console.error('❌ Error claiming ETH fees:', e.message);
    }
  } else {
    console.log('ℹ️ No ETH fees to claim');
  }
  
  if (tokenFees1 > 0n) {
    console.log('Claiming Token fees...');
    try {
      const claimTokenTx = await sdk.claimFeesToken(tokenAddress);
      console.log('Claim Token TX:', claimTokenTx);
      const receipt = await sdk.publicClient.waitForTransactionReceipt({ hash: claimTokenTx });
      console.log('✅ Token fees claimed! Status:', receipt.status);
      console.log('View on BaseScan: https://basescan.org/tx/' + claimTokenTx);
    } catch (e) {
      console.error('❌ Error claiming token fees:', e.message);
    }
  } else {
    console.log('ℹ️ No token fees to claim');
  }
  
  console.log('\n✅ Fee check and claim complete!');
}

main().catch(console.error);
