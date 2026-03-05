# Clawd NFTid System

**Generative NFT identity system for claw.click autonomous agents**

## 🏗️ Architecture

- **Contracts** - Solidity smart contracts (Foundry)
- **Backend** - Off-chain services for image compositing and event indexing
- **Traits** - Metadata and weight definitions

## 📋 Features

✅ **Tiered pricing** - 0.0015 / 0.003 / 0.0045 ETH based on supply  
✅ **Free mints** - 1 free mint for BirthCertificate holders  
✅ **No duplicates** - On-chain uniqueness enforcement  
✅ **Weighted rarity** - Trait-based rarity scoring  
✅ **Locked metadata** - Immutable traits after deployment  
✅ **Blockhash randomness** - Gas-efficient random generation  

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Node.js dependencies (for backend)
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Deploy to Sepolia

```bash
# Deploy contracts
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Register traits
forge script scripts/RegisterTraits.s.sol:RegisterTraitsScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

### 4. Run Tests

```bash
forge test -vv
```

## 📦 Contract Addresses

### Sepolia Testnet
- **ClawdNFT:** TBD
- **TraitRegistry:** TBD

### Base Mainnet
- **ClawdNFT:** TBD
- **TraitRegistry:** TBD

## 🎨 Trait System

### Layers (in order)
1. **Background** (10 variants, weight 10-95)
2. **Core** (10 variants, weight 10-100)
3. **Eyes** (9 variants, weight 5-95)
4. **Overlay** (9 variants, weight 10-90)
5. **Aura** (10 variants, weight 10-95)

### Rarity Tiers
| Tier | Score Range | Estimated % |
|------|-------------|-------------|
| Common | 0-100 | 60% |
| Uncommon | 101-200 | 25% |
| Rare | 201-300 | 10% |
| Epic | 301-400 | 4% |
| Legendary | 401-500 | 1% |

## 💰 Pricing

| Supply Range | Price (ETH) | Price (USD) |
|--------------|-------------|-------------|
| 0 - 4,000 | 0.0015 | ~$3 |
| 4,001 - 7,000 | 0.003 | ~$6 |
| 7,001 - 10,000 | 0.0045 | ~$9 |

**Free mint:** 1 per wallet that holds a BirthCertificate NFT

## 🔧 Backend Services

### Compositor
Generates composited PNG images from trait layers.

```typescript
import { compositeImage, generateMetadata } from './backend/compositor';

const traits = { aura: 5, background: 3, core: 8, eyes: 2, overlay: 4 };
const image = await compositeImage(traits);
const metadata = generateMetadata(123, traits, traitMetadata);
```

### Indexer
Listens to blockchain events and indexes minted NFTs.

```typescript
import { startIndexer, getNFTMetadata } from './backend/indexer';

await startIndexer(provider, contractAddress, contractABI);
const metadata = await getNFTMetadata(123);
```

## 📊 Database Schema

```sql
CREATE TABLE nftid_metadata (
  token_id INTEGER PRIMARY KEY,
  minter TEXT NOT NULL,
  aura_index INTEGER NOT NULL,
  background_index INTEGER NOT NULL,
  core_index INTEGER NOT NULL,
  eyes_index INTEGER NOT NULL,
  overlay_index INTEGER NOT NULL,
  rarity_score INTEGER NOT NULL,
  rarity_tier TEXT NOT NULL,
  free_mint BOOLEAN NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rarity_score ON nftid_metadata(rarity_score DESC);
CREATE INDEX idx_rarity_tier ON nftid_metadata(rarity_tier);
CREATE INDEX idx_minter ON nftid_metadata(minter);
```

## 🧪 Testing

```bash
# Run all tests
forge test

# Run with gas reporting
forge test --gas-report

# Run specific test
forge test --match-test testMintWithPayment

# Run with verbose output
forge test -vvv
```

## 📝 Deployment Checklist

### Sepolia Testnet
- [ ] Deploy ClawdNFT contract
- [ ] Deploy TraitRegistry contract
- [ ] Register all traits (auras, backgrounds, cores, eyes, overlays)
- [ ] Lock TraitRegistry
- [ ] Verify contracts on Etherscan
- [ ] Test minting (paid, free, tiered pricing)
- [ ] Test uniqueness enforcement
- [ ] Set up metadata API endpoint
- [ ] Test image compositor
- [ ] Test event indexer

### Base Mainnet
- [ ] Upload assets to IPFS (permanent storage)
- [ ] Update trait IPFS CIDs in RegisterTraits script
- [ ] Deploy contracts to Base
- [ ] Register traits with real IPFS CIDs
- [ ] Lock TraitRegistry
- [ ] Verify contracts on Basescan
- [ ] Set up production metadata API
- [ ] Set up production compositor service
- [ ] Set up production indexer
- [ ] Monitor first mints
- [ ] Update frontend with contract addresses

## 🔐 Security

- **Reentrancy protection** - ReentrancyGuard on mint function
- **Access control** - Ownable for admin functions
- **Supply cap** - Hard-coded 10,000 max supply
- **Uniqueness** - On-chain trait hash collision prevention
- **Free mint tracking** - On-chain storage prevents reuse
- **Integer safety** - Solidity 0.8+ built-in overflow checks

## 🚧 Known Limitations

- **Blockhash randomness** - Miners can influence (but not predict) randomness
  - For production, consider Chainlink VRF if budget allows
- **Max attempts** - Mint may fail if unable to find unique combo in N tries
  - Unlikely with 81,000 possible combinations vs 10,000 supply
- **Gas costs** - On-chain trait storage adds ~60k gas per mint
  - Acceptable for Base L2 (low gas fees)

## 📚 Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Base Network Docs](https://docs.base.org/)
- [ERC-721 Standard](https://eips.ethereum.org/EIPS/eip-721)

## 🦞 Next Steps

1. **Deploy to Sepolia** - Test all functionality
2. **Upload assets to IPFS** - Permanent decentralized storage
3. **Build metadata API** - Serve JSON/images for tokenURI
4. **Build frontend** - `/nftid/mint` and `/nftid/gallery` pages
5. **Deploy to Base** - Production launch

---

Built with 🦞 by the claw.click team
