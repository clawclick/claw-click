-- Add launch_type column to tokens table
-- Values: 'direct' (claws.fun hookless) or 'agent' (claw.click hook-based)
-- Default: 'agent' for backward compatibility with existing tokens

-- ALTER TABLE tokens
-- ADD COLUMN IF NOT EXISTS launch_type VARCHAR(10) DEFAULT 'agent';

-- -- Index for filtering by launch type
-- CREATE INDEX IF NOT EXISTS idx_tokens_launch_type ON tokens(launch_type);

-- -- Backfill: existing tokens are all AGENT (deployed before dual-launch support)
-- UPDATE tokens SET launch_type = 'agent' WHERE launch_type IS NULL;
