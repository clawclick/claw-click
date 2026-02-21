// Quick test to verify event fetching works
const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');
const FactoryABI = require('./src/abis/factory.json');

const FACTORY = '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://rpc.sepolia.org'),
});

async function testFetch() {
  console.log('Fetching LaunchCreated events from Factory:', FACTORY);
  console.log('Starting from block 0...\n');

  try {
    const events = await publicClient.getContractEvents({
      address: FACTORY,
      abi: FactoryABI,
      eventName: 'LaunchCreated',
      fromBlock: 10300000n,
      toBlock: 'latest',
    });

    console.log(`✅ Found ${events.length} LaunchCreated events\n`);

    events.forEach((event, i) => {
      console.log(`Event ${i + 1}:`);
      console.log('  Block:', event.blockNumber);
      console.log('  Tx:', event.transactionHash);
      
      const args = event.args;
      if (args) {
        console.log('  Token:', args.token);
        console.log('  Pool ID:', args.poolId);
        console.log('  Name:', args.name);
        console.log('  Symbol:', args.symbol);
      }
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    console.error(error);
  }
}

testFetch();
