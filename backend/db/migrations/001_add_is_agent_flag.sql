-- Add is_agent flag to differentiate agent tokenization vs regular token launches
-- TRUE = Agent tokenization from claws.fun (immortalized agent)
-- FALSE/NULL = Regular token launch from claw.click

-- ALTER TABLE tokens 
-- ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT FALSE;

-- -- Add index for filtering
-- CREATE INDEX IF NOT EXISTS idx_tokens_is_agent ON tokens(is_agent);

-- -- Add agent stats tracking
-- ALTER TABLE stats
-- ADD COLUMN IF NOT EXISTS total_agents INTEGER DEFAULT 0,
-- ADD COLUMN IF NOT EXISTS agent_mcap_total DECIMAL(30,18) DEFAULT 0,
-- ADD COLUMN IF NOT EXISTS agent_volume_24h DECIMAL(30,18) DEFAULT 0,
-- ADD COLUMN IF NOT EXISTS agent_volume_total DECIMAL(30,18) DEFAULT 0;

-- COMMENT ON COLUMN tokens.is_agent IS 'TRUE if token represents an immortalized agent (claws.fun), FALSE if regular token launch (claw.click native)';
