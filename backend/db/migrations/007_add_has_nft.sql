-- Add has_nft column to tokens table
-- Tracks whether the token's agent_wallet holds a claws.fun NFT
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS has_nft BOOLEAN DEFAULT FALSE;

-- Backfill: set has_nft = true for existing agent tokens (they passed NFT check)
UPDATE tokens SET has_nft = true WHERE is_agent = true;

-- Index for claws.fun stats queries
CREATE INDEX IF NOT EXISTS idx_tokens_has_nft ON tokens(has_nft) WHERE has_nft = true;

-- Add NFT-specific stats columns to stats table
-- These track volume/fees/tokens ONLY for tokens where has_nft = true
ALTER TABLE stats ADD COLUMN IF NOT EXISTS nft_total_tokens INTEGER DEFAULT 0;
ALTER TABLE stats ADD COLUMN IF NOT EXISTS nft_total_volume_eth DECIMAL(30,18) DEFAULT 0;
ALTER TABLE stats ADD COLUMN IF NOT EXISTS nft_total_volume_24h DECIMAL(30,18) DEFAULT 0;
ALTER TABLE stats ADD COLUMN IF NOT EXISTS nft_total_fees_eth DECIMAL(30,18) DEFAULT 0;
ALTER TABLE stats ADD COLUMN IF NOT EXISTS nft_total_txs BIGINT DEFAULT 0;
ALTER TABLE stats ADD COLUMN IF NOT EXISTS nft_total_txs_24h INTEGER DEFAULT 0;

-- Backfill NFT stats from existing data
UPDATE stats s SET
  nft_total_tokens = COALESCE((SELECT COUNT(*) FROM tokens WHERE has_nft = true AND chain_id = s.chain_id), 0),
  nft_total_volume_eth = COALESCE((SELECT SUM(volume_total) FROM tokens WHERE has_nft = true AND chain_id = s.chain_id), 0),
  nft_total_fees_eth = COALESCE((SELECT SUM(volume_total) / 100 FROM tokens WHERE has_nft = true AND chain_id = s.chain_id), 0);
