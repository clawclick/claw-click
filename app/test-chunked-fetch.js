// Test chunked event fetching
const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');
const FactoryABI = require('./src/abis/factory.json');

const FACTORY = '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J'),
});

async function queryEventsInChunks({
  client,
  address,
  abi,
  eventName,
  fromBlock,
  toBlock,
  args,
  chunkSize = 5000
}) {
  const endBlock = toBlock === 'latest' 
    ? await client.getBlockNumber()
    : BigInt(toBlock);

  console.log(`Querying from block ${fromBlock} to ${endBlock} (${endBlock - fromBlock} blocks)`);
  console.log(`Chunk size: ${chunkSize} blocks\n`);

  const allEvents = [];
  let currentFrom = fromBlock;

  while (currentFrom <= endBlock) {
    const currentTo = currentFrom + BigInt(chunkSize) > endBlock 
      ? endBlock 
      : currentFrom + BigInt(chunkSize);

    try {
      console.log(`Fetching blocks ${currentFrom} to ${currentTo}...`);
      const events = await client.getContractEvents({
        address,
        abi,
        eventName,
        args,
        fromBlock: currentFrom,
        toBlock: currentTo,
      });

      allEvents.push(...events);
      console.log(`  ✅ Found ${events.length} events`);
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
    }

    currentFrom = currentTo + 1n;
    if (currentFrom > endBlock) break;
  }

  return allEvents;
}

async function testChunkedFetch() {
  console.log('Testing chunked event fetching from Factory:', FACTORY);
  console.log('='.repeat(60) + '\n');

  try {
    const events = await queryEventsInChunks({
      client: publicClient,
      address: FACTORY,
      abi: FactoryABI,
      eventName: 'LaunchCreated',
      fromBlock: 10300000n,
      toBlock: 'latest',
      chunkSize: 2000,
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ TOTAL: Found ${events.length} LaunchCreated events\n`);

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
      }
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testChunkedFetch();
