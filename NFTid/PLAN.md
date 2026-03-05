# NFTid System - Implementation Plan

**Project:** Clawd NFT Identity System  
**Chain:** Base (Sepolia testnet → Base mainnet)  
**Total Supply:** 10,000 NFTs  
**Status:** Planning Phase

---

## Overview

NFTid is an optional but standard part of agent creation/immortalization. It provides a visual identity for agents using generative layered artwork with rarity-based traits.

### Key Features

✅ **Optional minting** - Can mint during immortalization or anytime after  
✅ **Weighted rarity system** - Traits have different weights; higher weight = rarer  
✅ **Tiered pricing** - Progressive pricing as supply depletes  
✅ **Free immortalization mint** - 1 free mint if you own a soulbound NFT  
✅ **Generative on-chain** - Traits combined to create unique NFTs  

---

## Asset Inventory

Located in: `C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\NFTid\clawd-assets\`

| Layer | Count | Examples |
|-------|-------|----------|
| **Auras** | 10 | 1-10_transparent.png |
| **Backgrounds** | 10 | background-1 through background-10.png |
| **Cores** | 10 | crimson, dark-matter, frozen, genesis, neural, overclock, plasma, quantum, solar, void |
| **Eyes** | 9 | binary, cross, glitched, hollow, laser, no-eyes, normal, tridot, vertical-lines |
| **Overlays** | 9 | 1-9_transparent.png |

**Total Combinations:** 10 × 10 × 10 × 9 × 9 = **81,000 possible NFTs**  
**Supply Cap:** **10,000 NFTs**

---

## Pricing Structure

| Supply Range | Price (ETH) | Tier |
|--------------|-------------|------|
| 0 - 4,000 | $3 (~0.0012 ETH) | Tier 1 |
| 4,001 - 7,000 | $6 (~0.0024 ETH) | Tier 2 |
| 7,001 - 10,000 | $9 (~0.0036 ETH) | Tier 3 |

**Note:** Prices in ETH will fluctuate with ETH/USD; contract should use Chainlink oracle or fixed ETH amounts.

### Free Mint Conditions

**1 free mint per eligible wallet** if:
- Minting wallet holds a soulbound NFT (BirthCertificate), OR
- Minting from an agent's wallet, OR
- Minting from a tokenized agent's owner wallet

**Implementation:** Check for BirthCertificate balance before applying mint fee.

---

## Rarity System

### Trait Weight Distribution

Each trait has a weight (1-100). Higher weight = rarer = higher rarity score.

**Example Weight Ranges:**
- **Common** (1-20): 60% of traits
- **Uncommon** (21-40): 25% of traits
- **Rare** (41-70): 10% of traits
- **Epic** (71-90): 4% of traits
- **Legendary** (91-100): 1% of traits

### Rarity Score Calculation

```
Total Rarity Score = Aura Weight + Background Weight + Core Weight + Eyes Weight + Overlay Weight
```

**Example:**
- Aura: Legendary (95)
- Background: Rare (50)
- Core: Epic (80)
- Eyes: Common (10)
- Overlay: Uncommon (30)

**Total Score:** 265 → **High Rarity NFT**

### Rarity Tiers

| Tier | Score Range | Estimated % |
|------|-------------|-------------|
| Common | 0-100 | 60% |
| Uncommon | 101-200 | 25% |
| Rare | 201-300 | 10% |
| Epic | 301-400 | 4% |
| Legendary | 401-500 | 1% |

---

## Smart Contract Architecture

### Core Contracts

#### 1. **ClawdNFT.sol** (Main ERC-721)
- ERC-721 compliant NFT contract
- Tracks total supply (max 10,000)
- Handles minting with tiered pricing
- Free mint eligibility check (BirthCertificate balance)
- Trait storage (uint8 for each layer index)
- Token URI generation (on-chain metadata)

#### 2. **TraitRegistry.sol** (Trait Management)
- Stores trait names and weights for each layer
- Allows owner to update trait metadata
- Returns trait data for rarity calculations
- Maps trait index → (name, weight, IPFS CID)

#### 3. **RarityCalculator.sol** (Rarity Scoring)
- Pure calculation logic
- Takes 5 trait weights → returns rarity score
- Determines rarity tier
- Reusable across contracts/frontend

#### 4. **MetadataRenderer.sol** (On-chain Metadata)
- Generates JSON metadata for tokenURI
- Combines trait names and IPFS URIs
- Includes rarity score and tier
- Returns base64-encoded JSON

### Contract Interactions

```
ClawdNFT
├── TraitRegistry (get trait data)
├── RarityCalculator (calculate score)
├── MetadataRenderer (generate tokenURI)
└── BirthCertificate (check free mint eligibility)
```

---

## Trait Generation Logic

### On-Chain Randomness

Use **Chainlink VRF v2** for verifiable randomness:

1. User calls `mint()` and pays fee
2. Contract requests random number from Chainlink VRF
3. VRF returns random seed
4. Contract uses seed to select traits:
   - Aura: `seed % 10` → index 0-9
   - Background: `(seed / 10) % 10` → index 0-9
   - Core: `(seed / 100) % 10` → index 0-9
   - Eyes: `(seed / 1000) % 9` → index 0-8
   - Overlay: `(seed / 10000) % 9` → index 0-8
5. Store traits in token data
6. Mint NFT to user

### Weighted Selection

For rarity weighting, we can use **rejection sampling**:

1. Generate random trait index
2. Generate random weight check (0-100)
3. If `weight_check < trait_weight`, select trait
4. Otherwise, try again (loop until trait selected)

This ensures rarer traits (higher weight) are less likely to be selected.

---

## Database Schema

### NFT Metadata Table

```sql
CREATE TABLE nftid_metadata (
  token_id INTEGER PRIMARY KEY,
  aura_index INTEGER NOT NULL,
  background_index INTEGER NOT NULL,
  core_index INTEGER NOT NULL,
  eyes_index INTEGER NOT NULL,
  overlay_index INTEGER NOT NULL,
  rarity_score INTEGER NOT NULL,
  rarity_tier TEXT NOT NULL, -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  minted_by TEXT NOT NULL, -- wallet address
  transaction_hash TEXT NOT NULL
);

CREATE INDEX idx_rarity_score ON nftid_metadata(rarity_score DESC);
CREATE INDEX idx_rarity_tier ON nftid_metadata(rarity_tier);
CREATE INDEX idx_minted_by ON nftid_metadata(minted_by);
```

### Trait Definitions Table

```sql
CREATE TABLE nftid_traits (
  id SERIAL PRIMARY KEY,
  layer TEXT NOT NULL, -- 'aura', 'background', 'core', 'eyes', 'overlay'
  trait_index INTEGER NOT NULL,
  trait_name TEXT NOT NULL,
  trait_weight INTEGER NOT NULL, -- 1-100
  ipfs_cid TEXT NOT NULL,
  UNIQUE(layer, trait_index)
);
```

---

## IPFS Storage Strategy

### Directory Structure

```
ipfs://QmRootHash/
├── auras/
│   ├── 1.png
│   ├── 2.png
│   └── ...
├── backgrounds/
│   ├── 1.png
│   ├── 2.png
│   └── ...
├── cores/
│   ├── crimson.png
│   ├── dark-matter.png
│   └── ...
├── eyes/
│   ├── binary.png
│   ├── laser.png
│   └── ...
└── overlays/
    ├── 1.png
    ├── 2.png
    └── ...
```

### Metadata JSON Example

```json
{
  "name": "Clawd #1234",
  "description": "An autonomous agent identity on claw.click",
  "image": "ipfs://QmComposited/1234.png",
  "attributes": [
    {
      "trait_type": "Aura",
      "value": "Cosmic Aura",
      "weight": 85,
      "rarity": "Epic"
    },
    {
      "trait_type": "Background",
      "value": "Neural Network",
      "weight": 50,
      "rarity": "Rare"
    },
    {
      "trait_type": "Core",
      "value": "Quantum Core",
      "weight": 95,
      "rarity": "Legendary"
    },
    {
      "trait_type": "Eyes",
      "value": "Laser Eyes",
      "weight": 70,
      "rarity": "Rare"
    },
    {
      "trait_type": "Overlay",
      "value": "Digital Overlay",
      "weight": 40,
      "rarity": "Uncommon"
    }
  ],
  "rarity_score": 340,
  "rarity_tier": "Epic"
}
```

---

## Frontend Integration

### Minting Flow

1. **User visits `/nftid/mint` page**
2. **Connect wallet** (RainbowKit)
3. **Check eligibility:**
   - Query BirthCertificate contract: `balanceOf(userAddress)`
   - If balance > 0 and hasn't used free mint → show "Free Mint" button
   - Otherwise → show current tier price
4. **Click "Mint NFT"**
5. **Transaction flow:**
   - Call `ClawdNFT.mint()` with correct value
   - Wait for Chainlink VRF callback
   - Poll for token minted event
6. **Show minted NFT:**
   - Display generated image (composited layers)
   - Show trait breakdown
   - Display rarity score and tier

### Gallery View

- **`/nftid/gallery`** - Browse all minted NFTs
- **Filters:** Rarity tier, specific traits
- **Sorting:** Rarity score, mint date, token ID
- **Detail view:** Click NFT → see full traits, rarity breakdown, owner

### Agent Profile Integration

On **`/immortal/agent/[id]`** page:
- Check if agent has associated NFTid
- Display NFT avatar if minted
- Show "Mint NFTid" button if not yet minted

---

## Testing Plan

### Phase 1: Sepolia Testnet

#### Step 1: Deploy Contracts
- Deploy TraitRegistry.sol
- Deploy RarityCalculator.sol
- Deploy MetadataRenderer.sol
- Deploy ClawdNFT.sol
- Link contracts together

#### Step 2: Set Up Traits
- Upload assets to IPFS (Pinata/NFT.Storage)
- Register all trait names, weights, and IPFS CIDs
- Verify trait data retrieval

#### Step 3: Test Minting
- Test standard mint (pay fee)
- Test free mint (with BirthCertificate mock)
- Test tier pricing transitions (4k, 7k thresholds)
- Test Chainlink VRF randomness
- Verify trait generation and storage

#### Step 4: Test Metadata
- Query tokenURI for minted NFTs
- Verify JSON structure
- Check rarity calculations
- Test composited image generation

#### Step 5: Frontend Integration
- Connect to Sepolia contracts
- Test wallet connection
- Test minting flow
- Test gallery display
- Test filtering and sorting

### Phase 2: Base Mainnet

Once all tests pass on Sepolia:
1. Deploy contracts to Base mainnet
2. Update frontend contract addresses
3. Upload production assets to IPFS
4. Register production traits
5. Announce mainnet launch

---

## Development Milestones

### Milestone 1: Contracts (Week 1-2)
- [ ] Write ClawdNFT.sol
- [ ] Write TraitRegistry.sol
- [ ] Write RarityCalculator.sol
- [ ] Write MetadataRenderer.sol
- [ ] Write deployment scripts (Foundry)
- [ ] Write contract tests (Foundry)

### Milestone 2: IPFS & Metadata (Week 2)
- [ ] Upload all assets to IPFS
- [ ] Generate trait weight mapping
- [ ] Create metadata templates
- [ ] Set up image compositing service (if needed)

### Milestone 3: Frontend (Week 3)
- [ ] Create `/nftid/mint` page
- [ ] Create `/nftid/gallery` page
- [ ] Integrate with RainbowKit
- [ ] Add NFTid to agent profile pages
- [ ] Build rarity leaderboard

### Milestone 4: Testing (Week 4)
- [ ] Deploy to Sepolia
- [ ] Test all minting scenarios
- [ ] Test free mint eligibility
- [ ] Verify rarity calculations
- [ ] Stress test contract limits

### Milestone 5: Mainnet Launch (Week 5)
- [ ] Deploy to Base mainnet
- [ ] Verify contracts on Basescan
- [ ] Update frontend configuration
- [ ] Monitor first mints
- [ ] Announce launch

---

## Security Considerations

### Contract Security
- **Reentrancy protection** - Use OpenZeppelin's ReentrancyGuard
- **Access control** - Only owner can update trait registry
- **Supply cap enforcement** - Hard-coded 10,000 max supply
- **VRF security** - Verify Chainlink VRF responses
- **Integer overflow** - Use Solidity 0.8+ (built-in checks)

### Frontend Security
- **Input validation** - Check mint eligibility before allowing transaction
- **Slippage protection** - Warn if ETH price changed significantly
- **Transaction monitoring** - Show pending/confirmed states clearly

### Economic Security
- **Price oracle** - Use Chainlink ETH/USD feed for dynamic pricing
- **Fee collection** - Secure treasury withdrawal mechanism
- **Free mint abuse** - Track used free mints per address

---

## Future Enhancements

### V2 Features
- **Trait trading** - Allow NFT holders to swap individual traits
- **Evolution system** - Burn 2 NFTs to create 1 higher-rarity NFT
- **Custom traits** - Allow agents to unlock special traits via achievements
- **3D models** - Generate 3D avatars from traits
- **Integration** - Use NFTid as profile pic across claw.click ecosystem

---

## Questions to Resolve

1. **Compositing:** Generate images on-chain (gas expensive) or off-chain (centralized)?
2. **Pricing:** Fixed ETH amounts or dynamic USD-pegged via oracle?
3. **Free mint tracking:** Store on-chain (gas cost) or off-chain (trust backend)?
4. **Chainlink VRF:** Can we afford VRF fees, or use blockhash (less secure)?
5. **Trait updates:** Should trait metadata be frozen post-launch or upgradeable?

---

## Resources

- **OpenZeppelin Contracts:** https://docs.openzeppelin.com/contracts/
- **Chainlink VRF:** https://docs.chain.link/vrf/v2/introduction
- **Foundry Docs:** https://book.getfoundry.sh/
- **IPFS Pinning:** https://www.pinata.cloud/ or https://nft.storage/
- **Base Network:** https://docs.base.org/

---

**Next Steps:** Review this plan, resolve open questions, then start Milestone 1 (contract development).
