# Quick Sepolia Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Get Sepolia ETH
- Faucet: https://www.alchemy.com/faucets/ethereum-sepolia
- You'll need ~0.05 ETH for deployment + gas

### 2. Set Environment Variables
```powershell
# Your deployer private key (starts with 0x)
$env:PRIVATE_KEY = "0x..."

# Sepolia RPC (use Alchemy/Infura or public node)
$env:SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com"

# Etherscan API key (for contract verification)
$env:ETHERSCAN_API_KEY = "your_etherscan_api_key"

# Optional: Treasury & Owner (defaults to deployer if not set)
$env:TREASURY_ADDRESS = "0x..."  # Where platform fees go
$env:OWNER_ADDRESS = "0x..."     # Contract admin
```

## 🚀 Deployment Steps

### Step 1: Deploy ClawclickConfig
```powershell
cd "C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\contracts"

forge script script/deploy/DeployConfig.s.sol:DeployConfig `
  --rpc-url $env:SEPOLIA_RPC `
  --private-key $env:PRIVATE_KEY `
  --broadcast `
  --verify --etherscan-api-key $env:ETHERSCAN_API_KEY
```

**Save the deployed address:**
```powershell
$env:CONFIG_ADDRESS = "0x..."  # Address from output
```

### Step 2: Deploy ClawclickHook
```powershell
forge script script/deploy/DeployHook.s.sol:DeployHook `
  --rpc-url $env:SEPOLIA_RPC `
  --private-key $env:PRIVATE_KEY `
  --broadcast `
  --verify --etherscan-api-key $env:ETHERSCAN_API_KEY
```

**Save the deployed address:**
```powershell
$env:HOOK_ADDRESS = "0x..."  # Address from output
```

### Step 3: Deploy ClawclickFactory
```powershell
forge script script/deploy/DeployFactory.s.sol:DeployFactory `
  --rpc-url $env:SEPOLIA_RPC `
  --private-key $env:PRIVATE_KEY `
  --broadcast `
  --verify --etherscan-api-key $env:ETHERSCAN_API_KEY
```

**Save the deployed address:**
```powershell
$env:FACTORY_ADDRESS = "0x..."  # Address from output
```

### Step 4: Configure Contracts
```powershell
forge script script/deploy/ConfigureContracts.s.sol:ConfigureContracts `
  --rpc-url $env:SEPOLIA_RPC `
  --private-key $env:PRIVATE_KEY `
  --broadcast
```

## ✅ Post-Deployment Verification

### Verify Contracts on Sepolia Etherscan
- Config: https://sepolia.etherscan.io/address/$CONFIG_ADDRESS
- Hook: https://sepolia.etherscan.io/address/$HOOK_ADDRESS
- Factory: https://sepolia.etherscan.io/address/$FACTORY_ADDRESS

### Test Factory Access
```powershell
cast call $CONFIG_ADDRESS "factory()" --rpc-url $env:SEPOLIA_RPC
# Should return $FACTORY_ADDRESS
```

### Check System Status
```powershell
# Check if operational
cast call $CONFIG_ADDRESS "isOperational()" --rpc-url $env:SEPOLIA_RPC
# Should return true (not paused)

# Check platform share (30% = 3000 bps)
cast call $CONFIG_ADDRESS "platformShareBps()" --rpc-url $env:SEPOLIA_RPC
# Should return 0x0bb8 (3000 in hex)
```

## 🧪 Test Launch

### Create First Test Launch
```powershell
# Coming soon: CreateTestLaunch.s.sol
```

## 📊 Deployed Addresses

Save these for future reference:

```
SEPOLIA DEPLOYMENT (2026-02-18)
═══════════════════════════════════════════════

ClawclickConfig:  $CONFIG_ADDRESS
ClawclickHook:    $HOOK_ADDRESS  
ClawclickFactory: $FACTORY_ADDRESS

V4 Dependencies:
- PoolManager:     0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
- PositionManager: 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4

Network: Sepolia (Chain ID: 11155111)
Explorer: https://sepolia.etherscan.io
RPC: https://ethereum-sepolia-rpc.publicnode.com
```

## 🆘 Troubleshooting

### "Insufficient funds"
- Get more Sepolia ETH from faucet
- Check balance: `cast balance YOUR_ADDRESS --rpc-url $env:SEPOLIA_RPC`

### "Contract verification failed"
- Double-check Etherscan API key
- Manual verification: https://sepolia.etherscan.io/verifyContract

### "Transaction reverted"
- Check RPC URL is correct
- Verify environment variables are set
- Check deployer has enough ETH

## 📝 Notes

- Total gas cost: ~0.03-0.05 ETH
- Deployment time: ~5-10 minutes (with verification)
- All contracts are upgradeable via owner functions
- Treasury & platformShareBps can be updated post-deployment
