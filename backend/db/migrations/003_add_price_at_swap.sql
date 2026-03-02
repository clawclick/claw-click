-- Add price_at_swap column to swaps table for 24h price change calculation
-- ALTER TABLE swaps ADD COLUMN IF NOT EXISTS price_at_swap DECIMAL(36,18);

-- -- Index for efficient 24h lookback
-- CREATE INDEX IF NOT EXISTS idx_swaps_token_timestamp ON swaps(token_address, timestamp DESC);
