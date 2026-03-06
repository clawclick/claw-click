# 🚨 Sepolia ETH Needed

**Status:** Deployment ready, waiting for funds  
**Deployer Wallet:** `0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7`

---

## Funding Requirements

**Needed:** ~0.0000052 ETH (~$0.01)  
**Current Balance:** 0.000000000000063 ETH  
**Shortfall:** ~0.0052 ETH

---

## How to Get Sepolia ETH

### Option 1: Alchemy Faucet (Recommended)
1. Go to https://www.alchemy.com/faucets/ethereum-sepolia
2. Connect wallet or enter address: `0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7`
3. Request 0.5 ETH (more than enough)

### Option 2: Sepolia PoW Faucet
1. Go to https://sepoliafaucet.com/
2. Enter address: `0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7`
3. Complete captcha and request

### Option 3: Google Cloud Faucet
1. Go to https://cloud.google.com/application/web3/faucet/ethereum/sepolia
2. Sign in with Google
3. Request Sepolia ETH

### Option 4: Infura Faucet
1. Go to https://www.infura.io/faucet/sepolia
2. Sign in with Infura account
3. Request Sepolia ETH

---

## Once Funded - Run This Command

```powershell
$env:Path += ";C:\Users\ClawdeBot\Desktop\foundry"
$env:FOUNDRY_DISABLE_NIGHTLY_WARNING = "1"
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\NFTid

# Deploy contracts
forge script scripts/Deploy.s.sol:DeployScript \
  --fork-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J \
  --broadcast \
  --legacy

# SAVE THE ADDRESSES FROM OUTPUT!
# Then update .env:
# TRAIT_REGISTRY_ADDRESS_SEPOLIA=0x...
# CLAWD_NFT_ADDRESS_SEPOLIA=0x...
```

---

## After Successful Deployment

1. ✅ Copy contract addresses to `.env`
2. ✅ Run trait registration script
3. ✅ Test minting
4. ✅ Update deployment log

---

**Note:** The contracts are ready to deploy - we just need ETH in the wallet!
