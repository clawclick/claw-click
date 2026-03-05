# 🚀 NFTid Quick Start - 1 Hour Deploy

**Goal:** Get NFTid deployed and testable on Sepolia in 1 hour

## ⚡ Fast Track (Do This Now)

### 1. Configure (5 min)
```bash
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\NFTid

# Create .env file
cp .env.example .env

# Edit .env - MINIMUM required:
# PRIVATE_KEY=your_key_here
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# BIRTH_CERTIFICATE_ADDRESS=0x0000000000000000000000000000000000000000
# METADATA_BASE_URI=https://api.claw.click/nftid/metadata
```

### 2. Install (2 min)
```bash
# Install Foundry (if needed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

### 3. Test (5 min)
```bash
# Build contracts
forge build

# Run tests
forge test -vv

# Should see all tests passing ✅
```

### 4. Deploy to Sepolia (10 min)
```bash
# Deploy contracts
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast

# ⚠️ SAVE THE ADDRESSES FROM OUTPUT ⚠️
# ClawdNFT: 0x...
# TraitRegistry: 0x...
```

### 5. Register Traits (15 min)
```bash
# Add registry address to .env
echo "TRAIT_REGISTRY_ADDRESS=0xYOUR_REGISTRY_ADDRESS" >> .env

# Register all traits
forge script scripts/RegisterTraits.s.sol:RegisterTraitsScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast

# This will register and LOCK the registry
```

### 6. Test Mint (5 min)
```bash
# Set contract address
export CLAWD_NFT=0xYOUR_CLAWD_NFT_ADDRESS

# Mint token #0
cast send $CLAWD_NFT \
  "mint(uint256)" 10 \
  --value 0.0015ether \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Check total supply (should be 1)
cast call $CLAWD_NFT "totalSupply()" --rpc-url $SEPOLIA_RPC_URL

# Get traits for token #0
cast call $CLAWD_NFT "getTraits(uint256)" 0 --rpc-url $SEPOLIA_RPC_URL
```

## ✅ Success Checklist

After 1 hour you should have:
- [x] Contracts compiled
- [x] Tests passing
- [x] Deployed to Sepolia
- [x] Traits registered and locked
- [x] At least 1 test mint successful
- [x] Token traits readable on-chain

## 🔍 Verify Deployment

### Check Contract on Etherscan
```
https://sepolia.etherscan.io/address/YOUR_CLAWD_NFT_ADDRESS
```

### Read Contract State
```bash
# Total supply
cast call $CLAWD_NFT "totalSupply()" --rpc-url $SEPOLIA_RPC_URL

# Current price (should be 0.0015 ether = 1500000000000000 wei)
cast call $CLAWD_NFT "getCurrentPrice()" --rpc-url $SEPOLIA_RPC_URL

# Max supply (should be 10000)
cast call $CLAWD_NFT "MAX_SUPPLY()" --rpc-url $SEPOLIA_RPC_URL
```

### Test Free Mint Eligibility
```bash
# Check if address is eligible (will be false if no BirthCertificate)
cast call $CLAWD_NFT \
  "isEligibleForFreeMint(address)" $YOUR_ADDRESS \
  --rpc-url $SEPOLIA_RPC_URL
```

## 🐛 Common Issues

### "Failed to get EIP-1559 fees"
```bash
# Use legacy transaction
forge script ... --legacy
```

### "Insufficient funds"
```bash
# Get Sepolia ETH from faucet
# https://sepoliafaucet.com/
# https://www.alchemy.com/faucets/ethereum-sepolia
```

### "Contract not found"
```bash
# Wait for deployment transaction to confirm
# Check on Etherscan: https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

### "Could not generate unique traits"
```bash
# This is very unlikely, but if it happens:
# Increase maxAttempts parameter: mint(50) instead of mint(10)
```

## 📊 What's Next?

### Immediate (Tonight)
1. ✅ Deploy to Sepolia ← YOU ARE HERE
2. Test multiple mints (verify uniqueness)
3. Test free mint with mock BirthCertificate
4. Test price tier transitions (mint 4001 tokens to see tier 2)

### Tomorrow
1. Upload assets to IPFS
2. Build metadata API endpoint
3. Test image compositor
4. Set up event indexer

### This Week
1. Build frontend mint page
2. Build gallery page
3. Deploy to Base mainnet
4. Launch 🚀

## 🦞 Need Help?

```bash
# Check logs
forge script ... --broadcast -vvvv

# Debug transaction
cast run $TX_HASH --rpc-url $SEPOLIA_RPC_URL

# Get contract storage
cast storage $CONTRACT_ADDRESS 0 --rpc-url $SEPOLIA_RPC_URL
```

---

**Time check:** If you followed this guide, you should be deployed in under 1 hour! 🎉
