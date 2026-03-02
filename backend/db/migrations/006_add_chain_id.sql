-- Add chain_id column to all tables for multichain support
-- Default: 8453 (Base mainnet) for new rows
-- Backfill: existing data is Sepolia (11155111)

-- tokens: add chain_id, update unique constraint to be per-chain
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 8453;

-- Backfill existing Sepolia data ONLY if no Sepolia rows exist yet
-- (prevents overwriting real Base 8453 data on re-run)
UPDATE tokens SET chain_id = 11155111
WHERE chain_id = 8453
  AND NOT EXISTS (SELECT 1 FROM tokens WHERE chain_id = 11155111);

-- Drop old unique on address alone, add composite unique (address + chain_id)
-- Token address could theoretically exist on multiple chains
ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_address_key;
ALTER TABLE tokens ADD CONSTRAINT tokens_address_chain_unique UNIQUE (address, chain_id);

-- swaps: add chain_id
ALTER TABLE swaps ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 8453;
UPDATE swaps SET chain_id = 11155111
WHERE chain_id = 8453
  AND NOT EXISTS (SELECT 1 FROM swaps WHERE chain_id = 11155111);

-- stats: convert to per-chain stats (remove single-row constraint, add chain_id)
ALTER TABLE stats DROP CONSTRAINT IF EXISTS single_row;
ALTER TABLE stats DROP CONSTRAINT IF EXISTS stats_pkey;
ALTER TABLE stats ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 8453;
UPDATE stats SET chain_id = 11155111
WHERE chain_id = 8453
  AND NOT EXISTS (SELECT 1 FROM stats WHERE chain_id = 11155111);
ALTER TABLE stats ADD PRIMARY KEY (chain_id);

-- Insert Base mainnet stats row (won't conflict if already exists)
INSERT INTO stats (chain_id, total_tokens, total_volume_eth, total_volume_24h, total_txs, total_txs_24h, total_fees_eth)
VALUES (8453, 0, 0, 0, 0, 0, 0)
ON CONFLICT (chain_id) DO NOTHING;

-- Indexes for chain-filtered queries
CREATE INDEX IF NOT EXISTS idx_tokens_chain_id ON tokens(chain_id);
CREATE INDEX IF NOT EXISTS idx_tokens_chain_launched ON tokens(chain_id, launched_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_chain_volume ON tokens(chain_id, volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_chain_mcap ON tokens(chain_id, current_mcap DESC);
CREATE INDEX IF NOT EXISTS idx_swaps_chain_id ON swaps(chain_id);
CREATE INDEX IF NOT EXISTS idx_swaps_chain_timestamp ON swaps(chain_id, timestamp DESC);
