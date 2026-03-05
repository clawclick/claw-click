/**
 * Blockchain Indexer Service
 * 
 * Listens to ClawdNFT contract events and indexes minted NFTs
 * Stores trait data and metadata in database
 */

import { ethers } from 'ethers';

interface MintEvent {
  tokenId: number;
  minter: string;
  traits: {
    aura: number;
    background: number;
    core: number;
    eyes: number;
    overlay: number;
  };
  freeMint: boolean;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

/**
 * Initialize indexer and start listening for events
 */
export async function startIndexer(
  provider: ethers.Provider,
  contractAddress: string,
  contractABI: any[]
) {
  const contract = new ethers.Contract(contractAddress, contractABI, provider);

  console.log(`Starting indexer for ClawdNFT at ${contractAddress}`);

  // Listen for Minted events
  contract.on(
    'Minted',
    async (
      tokenId: bigint,
      minter: string,
      aura: number,
      background: number,
      core: number,
      eyes: number,
      overlay: number,
      freeMint: boolean,
      event: any
    ) => {
      try {
        const block = await provider.getBlock(event.blockNumber);

        const mintEvent: MintEvent = {
          tokenId: Number(tokenId),
          minter,
          traits: { aura, background, core, eyes, overlay },
          freeMint,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: block?.timestamp || 0,
        };

        await processMintEvent(mintEvent);
      } catch (error) {
        console.error('Error processing mint event:', error);
      }
    }
  );

  // Sync historical events
  await syncHistoricalEvents(contract, provider);
}

/**
 * Process a mint event and store in database
 */
async function processMintEvent(event: MintEvent) {
  console.log(`Processing mint: Token #${event.tokenId} by ${event.minter}`);

  // TODO: Store in database
  // INSERT INTO nftid_metadata (
  //   token_id, minter, aura_index, background_index, core_index, 
  //   eyes_index, overlay_index, free_mint, block_number, 
  //   transaction_hash, minted_at
  // ) VALUES (...)

  // TODO: Calculate rarity score and tier
  // UPDATE nftid_metadata SET rarity_score = ?, rarity_tier = ? WHERE token_id = ?

  console.log(`Stored NFT #${event.tokenId}:`, {
    traits: event.traits,
    freeMint: event.freeMint,
  });
}

/**
 * Sync historical mint events from contract deployment
 */
async function syncHistoricalEvents(
  contract: ethers.Contract,
  provider: ethers.Provider
) {
  console.log('Syncing historical events...');

  const currentBlock = await provider.getBlockNumber();
  const deploymentBlock = 0; // TODO: Get from config or contract deployment

  const filter = contract.filters.Minted();
  const events = await contract.queryFilter(
    filter,
    deploymentBlock,
    currentBlock
  );

  console.log(`Found ${events.length} historical mint events`);

  for (const event of events) {
    if (event.args) {
      const block = await provider.getBlock(event.blockNumber);

      const mintEvent: MintEvent = {
        tokenId: Number(event.args[0]),
        minter: event.args[1],
        traits: {
          aura: event.args[2],
          background: event.args[3],
          core: event.args[4],
          eyes: event.args[5],
          overlay: event.args[6],
        },
        freeMint: event.args[7],
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: block?.timestamp || 0,
      };

      await processMintEvent(mintEvent);
    }
  }

  console.log('Historical sync complete');
}

/**
 * Get NFT metadata by token ID
 */
export async function getNFTMetadata(tokenId: number): Promise<any> {
  // TODO: Query database for stored metadata
  // SELECT * FROM nftid_metadata WHERE token_id = ?

  return {
    tokenId,
    traits: {},
    rarityScore: 0,
    rarityTier: 'Common',
    minter: '0x...',
    mintedAt: new Date(),
  };
}

/**
 * Get all NFTs with filters
 */
export async function queryNFTs(filters?: {
  rarityTier?: string;
  minRarityScore?: number;
  minter?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  // TODO: Build and execute database query with filters
  // SELECT * FROM nftid_metadata WHERE ...

  return [];
}
