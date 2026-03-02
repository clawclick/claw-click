-- -- Add chain_id column to all tables for multichain support
-- -- Default: 8453 (Base mainnet) for new rows

-- -- tokens: add chain_id
-- ALTER TABLE tokens ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 8453;

-- -- swaps: add chain_id
-- ALTER TABLE swaps ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 8453;

-- -- stats: add chain_id (keep single-row structure)
-- ALTER TABLE stats ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 8453;

-- -- Indexes for chain-filtered queries
-- CREATE INDEX IF NOT EXISTS idx_tokens_chain_id ON tokens(chain_id);
-- CREATE INDEX IF NOT EXISTS idx_tokens_chain_launched ON tokens(chain_id, launched_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_tokens_chain_volume ON tokens(chain_id, volume_24h DESC);
-- CREATE INDEX IF NOT EXISTS idx_tokens_chain_mcap ON tokens(chain_id, current_mcap DESC);
-- CREATE INDEX IF NOT EXISTS idx_swaps_chain_id ON swaps(chain_id);
-- CREATE INDEX IF NOT EXISTS idx_swaps_chain_timestamp ON swaps(chain_id, timestamp DESC);
