# Quick Command Reference - Sepolia Testing

**Working Directory:** `C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\NFTid`  
**Network:** Sepolia Testnet ONLY  
**Deployer:** 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7

---

## Setup Commands (Run Once)

```powershell
# Add Foundry to PATH
$env:Path += ";C:\Users\ClawdeBot\Desktop\foundry"
$env:FOUNDRY_DISABLE_NIGHTLY_WARNING = "1"

# Navigate to project
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\NFTid
```

---

## Deployment Commands

### 1. Deploy Contracts

```powershell
forge script scripts/Deploy.s.sol:DeployScript \
  --fork-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --legacy
```

**Expected Output:**
```
TraitRegistry: 0x...
ClawdNFT: 0x...
```

**Action:** Copy both addresses and update `.env`:
```
TRAIT_REGISTRY_ADDRESS_SEPOLIA=0x...
CLAWD_NFT_ADDRESS_SEPOLIA=0x...
```

---

### 2. Register Traits

```powershell
# First, update .env with TRAIT_REGISTRY_ADDRESS from step 1
echo 'TRAIT_REGISTRY_ADDRESS=0xYOUR_ADDRESS_HERE' >> .env

# Then run registration
forge script scripts/RegisterTraits.s.sol:RegisterTraitsScript \
  --fork-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --legacy
```

**Expected Output:**
```
Registering auras...
Registering backgrounds...
Registering cores...
Registering eyes...
Registering overlays...
Locking registry...
✅ All traits registered and registry locked!
```

---

## Testing Commands (Using Cast)

### Check Balances

```powershell
# Check deployer ETH balance
cast balance 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J

# Check if wallet has BirthCertificate (for free mint)
cast call 0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132 \
  "balanceOf(address)(uint256)" 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
```

### Check Contract State

```powershell
# Set contract address (replace with actual)
$CLAWD_NFT = "0x6150FaC3fDA582638747cC42f33DE8061db9d0DB"

# Total supply
cast call $CLAWD_NFT "totalSupply()(uint256)" \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J

# Current price
cast call $CLAWD_NFT "getCurrentPrice()(uint256)" \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J

# Max supply
cast call $CLAWD_NFT "MAX_SUPPLY()(uint256)" \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J

# Check free mint eligibility
cast call $CLAWD_NFT \
  "isEligibleForFreeMint(address)(bool)" \
  0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
```

### Mint NFTs

```powershell
# Mint with payment (0.0015 ETH)
cast send $CLAWD_NFT \
  "mint(uint256)" 10 \
  --value 0.0015ether \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --private-key $env:TESTING_DEV_WALLET_PK \
  --legacy

# Wait for transaction, then check traits
cast call $CLAWD_NFT \
  "getTraits(uint256)((uint8,uint8,uint8,uint8,uint8))" 0 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J

# Get token URI
cast call $CLAWD_NFT \
  "tokenURI(uint256)(string)" 0 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
```

### Test Free Mint (if eligible)

```powershell
# Mint without value (free mint)
cast send $CLAWD_NFT \
  "mint(uint256)" 10 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --private-key $env:TESTING_DEV_WALLET_PK \
  --legacy
```

---

## Verification Commands

### Check Transaction Status

```powershell
# Replace TX_HASH with your transaction hash
cast receipt 0xYOUR_TX_HASH \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
```

### View on Etherscan

```
# TraitRegistry
https://sepolia.etherscan.io/address/0xcfB3C2a2b615D55691D32080D42A25D69AAfc17a

# ClawdNFT
https://sepolia.etherscan.io/address/0x6150FaC3fDA582638747cC42f33DE8061db9d0DB

# Your wallet
https://sepolia.etherscan.io/address/0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7
```

---

## Debugging Commands

### Check Gas Price

```powershell
cast gas-price \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
```

### Estimate Gas for Mint

```powershell
cast estimate $CLAWD_NFT \
  "mint(uint256)" 10 \
  --value 0.0015ether \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --from 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7
```

### Read Contract Storage

```powershell
# Slot 0: totalSupply
cast storage $CLAWD_NFT 0 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
```

---

## Clean Build (if needed)

```powershell
forge clean
forge build
```

---

## Important Notes

⚠️ **ONLY USE SEPOLIA TESTNET**  
⚠️ **Never broadcast mainnet transactions**  
⚠️ **Always verify contract addresses before interacting**  
⚠️ **Keep private keys secure**  

🦞 **All operations are in NFTid directory only**
