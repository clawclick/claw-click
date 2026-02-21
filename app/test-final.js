// Final test with recent blocks approach
const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');
const FactoryABI = require('./src/abis/factory.json');

const FACTORY = '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
});

async function testFinalApproach() {
  console.log('Testing FINAL approach: Query last 1500 blocks');
  console.log('Factory:', FACTORY);
  console.log('='.repeat(60) + '\n');

  try {
    // Get current block
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock > 1500n ? currentBlock - 1500n : 0n;
    
    console.log(`Current block: ${currentBlock}`);
    console.log(`Querying from block: ${fromBlock}`);
    console.log(`Range: ${currentBlock - fromBlock} blocks\n`);

    const events = await publicClient.getContractEvents({
      address: FACTORY,
      abi: FactoryABI,
      eventName: 'LaunchCreated',
      fromBlock,
      toBlock: 'latest',
    });

    console.log('='.repeat(60));
    console.log(`✅ SUCCESS: Found ${events.length} LaunchCreated events\n`);

    events.forEach((event, i) => {
      console.log(`Event ${i + 1}:`);
      console.log('  Block:', event.blockNumber?.toString());
      console.log('  Tx:', event.transactionHash);
      
      const args = event.args;
      if (args) {
        console.log('  Token:', args.token);
        console.log('  Pool ID:', args.poolId);
        console.log('  Name:', args.name);
        console.log('  Symbol:', args.symbol);
        console.log('  Target MCAP:', args.targetMcapETH?.toString(), 'wei');
      }
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

testFinalApproach();
