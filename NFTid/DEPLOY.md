# NFTid Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup
```bash
# Copy and configure environment variables
cp .env.example .env

# Required variables:
# - PRIVATE_KEY (deployer wallet)
# - SEPOLIA_RPC_URL or BASE_RPC_URL
# - BIRTH_CERTIFICATE_ADDRESS (existing contract)
# - METADATA_BASE_URI (your API endpoint)
# - ETHERSCAN_API_KEY or BASESCAN_API_KEY
```

### 2. Install Dependencies
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Node dependencies
npm install
```

### 3. Test Contracts
```bash
forge test -vv
```

## Sepolia Testnet Deployment

### Step 1: Deploy Contracts
```bash
# Deploy ClawdNFT and TraitRegistry
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Save the deployed addresses from console output
```

### Step 2: Register Traits
```bash
# Update .env with TRAIT_REGISTRY_ADDRESS from step 1
echo "TRAIT_REGISTRY_ADDRESS=0x..." >> .env

# Register all traits and lock registry
forge script scripts/RegisterTraits.s.sol:RegisterTraitsScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

### Step 3: Test Minting
```bash
# Use Foundry cast to test mint
cast send $CLAWD_NFT_ADDRESS \
  "mint(uint256)" 10 \
  --value 0.0015ether \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Verify token was minted
cast call $CLAWD_NFT_ADDRESS \
  "totalSupply()" \
  --rpc-url $SEPOLIA_RPC_URL
```

### Step 4: Test Free Mint
```bash
# First, verify you have a BirthCertificate NFT
cast call $BIRTH_CERTIFICATE_ADDRESS \
  "balanceOf(address)(uint256)" $YOUR_ADDRESS \
  --rpc-url $SEPOLIA_RPC_URL

# If balance > 0, test free mint (no --value)
cast send $CLAWD_NFT_ADDRESS \
  "mint(uint256)" 10 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Step 5: Verify Metadata
```bash
# Get traits for token #0
cast call $CLAWD_NFT_ADDRESS \
  "getTraits(uint256)" 0 \
  --rpc-url $SEPOLIA_RPC_URL

# Get token URI
cast call $CLAWD_NFT_ADDRESS \
  "tokenURI(uint256)" 0 \
  --rpc-url $SEPOLIA_RPC_URL
```

## Base Mainnet Deployment

### Pre-Flight Checklist
- [ ] All Sepolia tests passed
- [ ] Assets uploaded to IPFS
- [ ] IPFS CIDs updated in RegisterTraits.s.sol
- [ ] Metadata API endpoint ready
- [ ] Image compositor service ready
- [ ] Event indexer service ready
- [ ] BirthCertificate contract address confirmed
- [ ] Deployer wallet funded with ETH

### Step 1: Deploy to Base
```bash
# Deploy contracts
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify

# ⚠️ SAVE THESE ADDRESSES IMMEDIATELY ⚠️
# ClawdNFT: 0x...
# TraitRegistry: 0x...
```

### Step 2: Register Traits
```bash
# Update .env with production addresses
echo "TRAIT_REGISTRY_ADDRESS=0x..." >> .env

# Register traits with IPFS CIDs
forge script scripts/RegisterTraits.s.sol:RegisterTraitsScript \
  --rpc-url $BASE_RPC_URL \
  --broadcast

# ⚠️ THIS LOCKS THE REGISTRY PERMANENTLY ⚠️
```

### Step 3: Update Frontend
```bash
# Update contract addresses in frontend config
# File: app/src/config/contracts.ts

export const NFTID_CONTRACTS = {
  base: {
    clawdNFT: '0x...',
    traitRegistry: '0x...',
  },
};
```

### Step 4: Start Backend Services
```bash
# Start compositor service
npm run compositor

# Start indexer service (separate terminal)
npm run indexer
```

### Step 5: Monitor First Mints
```bash
# Watch for Minted events
cast logs \
  --address $CLAWD_NFT_ADDRESS \
  --rpc-url $BASE_RPC_URL \
  --follow

# Check total supply
watch -n 5 "cast call $CLAWD_NFT_ADDRESS 'totalSupply()' --rpc-url $BASE_RPC_URL"
```

## Post-Deployment

### Verify on Basescan
1. Go to https://basescan.org/address/YOUR_CONTRACT_ADDRESS
2. Check "Contract" tab shows verified code
3. Test "Read Contract" functions
4. Test "Write Contract" mint function

### Test Metadata Endpoint
```bash
# Should return JSON metadata
curl https://api.claw.click/nftid/metadata/0

# Should return PNG image
curl https://api.claw.click/nftid/image/0 > test.png
```

### Monitor Contract
- Set up alerts for large mints
- Monitor gas usage
- Track pricing tier transitions
- Watch for errors/reverts

## Troubleshooting

### "Could not generate unique traits"
- Increase `maxAttempts` parameter in mint call
- Check how many tokens have been minted (approaching 10k?)
- Verify trait combination space isn't exhausted

### "Insufficient payment"
- Check current price: `cast call $CLAWD_NFT_ADDRESS "getCurrentPrice()"`
- Ensure --value matches or exceeds price
- Account for tier changes (4k, 7k thresholds)

### "Refund failed"
- Ensure user wallet can receive ETH
- Check if user is contract (may not accept ETH)

### Verification Failed
- Ensure correct compiler version (0.8.20)
- Check optimizer settings match foundry.toml
- Verify constructor arguments match deployment

## Emergency Procedures

### Pause Minting
```bash
# Option 1: Set base URI to error message
cast send $CLAWD_NFT_ADDRESS \
  "setBaseMetadataURI(string)" "https://claw.click/maintenance" \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Withdraw Funds
```bash
cast send $CLAWD_NFT_ADDRESS \
  "withdraw()" \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Update BirthCertificate Address
```bash
cast send $CLAWD_NFT_ADDRESS \
  "setBirthCertificateContract(address)" $NEW_ADDRESS \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Rollback Plan

If critical issues found after deployment:

1. **Do NOT** mint more tokens
2. Announce issue on social media
3. Deploy new contract version
4. Airdrop equivalent NFTs to existing holders
5. Deprecate old contract (set base URI to migration notice)

⚠️ **Cannot rollback after traits are registered and locked** ⚠️

---

## Success Metrics

### Testnet
- ✅ 10+ successful mints
- ✅ Free mint works for BirthCertificate holders
- ✅ Price tiers transition correctly
- ✅ All tokens have unique trait combos
- ✅ Metadata API returns correct JSON/images
- ✅ No reverts or gas issues

### Mainnet
- ✅ Contract verified on Basescan
- ✅ First 100 mints successful
- ✅ No reported issues
- ✅ Frontend displays NFTs correctly
- ✅ Rarity scores calculate correctly
- ✅ Backend services running smoothly

🦞 **Good luck, builder!**
