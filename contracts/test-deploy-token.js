const { ethers } = require('ethers');
const fs = require('fs');

const FACTORY_ADDRESS = '0x5C92E6f1Add9a2113C6977DfF15699e948e017Db';
const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J';
const PRIVATE_KEY = '0x0075f14030668b47b7f9d8b7a7fe173a96071129c9f0638aec02e74d4bcda65a';

const FactoryABI = JSON.parse(fs.readFileSync('./SEPOLIA_FACTORY_ABI.json', 'utf8'));

async function deployTestToken() {
  console.log('🚀 Deploying test token to Sepolia...\n');
  
  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const factory = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, wallet);
  
  console.log('Deployer:', wallet.address);
  console.log('Balance:', ethers.utils.formatEther(await wallet.getBalance()), 'ETH\n');
  
  const bootstrap = ethers.utils.parseEther('0.001'); // $2 bootstrap
  
  const params = {
    name: 'TestAgentToken',
    symbol: 'TEST',
    beneficiary: wallet.address,
    agentWallet: wallet.address,
    targetMcapETH: ethers.utils.parseEther('1'), // 1 ETH target MCAP
    feeSplit: {
      wallets: [
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      ],
      percentages: [0, 0, 0, 0, 0],
      count: 0,
    },
  };
  
  console.log('Launching token:', params.name, `($${params.symbol})`);
  console.log('Target MCAP:', ethers.utils.formatEther(params.targetMcapETH), 'ETH');
  console.log('Bootstrap:', ethers.utils.formatEther(bootstrap), 'ETH\n');
  
  const tx = await factory.createLaunch(params, { value: bootstrap });
  console.log('Transaction sent:', tx.hash);
  console.log('Waiting for confirmation...\n');
  
  const receipt = await tx.wait();
  console.log('✅ Transaction confirmed!');
  console.log('Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('');
  
  // Extract event data
  const launchEvent = receipt.events?.find(e => e.event === 'LaunchCreated');
  if (launchEvent) {
    console.log('📝 Launch Details:');
    console.log('Token Address:', launchEvent.args.token);
    console.log('Pool ID:', launchEvent.args.poolId);
    console.log('Creator:', launchEvent.args.creator);
    console.log('Beneficiary:', launchEvent.args.beneficiary);
    console.log('Target MCAP:', ethers.utils.formatEther(launchEvent.args.targetMcap), 'ETH');
    console.log('Timestamp:', new Date(launchEvent.args.timestamp.toNumber() * 1000).toLocaleString());
    console.log('');
    console.log('🔗 Etherscan:', `https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log('🔗 Token:', `https://sepolia.etherscan.io/address/${launchEvent.args.token}`);
    console.log('');
    console.log('✅ Token launched successfully!');
    console.log('⏰ You have 1 minute to buy tax-free!');
  }
}

deployTestToken()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
