-- Add total_fees_eth to stats table to track actual fee revenue from FeesCollected events
-- ALTER TABLE stats
-- ADD COLUMN IF NOT EXISTS total_fees_eth DECIMAL(30,18) DEFAULT 0;

-- COMMENT ON COLUMN stats.total_fees_eth IS 'Actual cumulative fees in ETH from FeesCollected hook events';
