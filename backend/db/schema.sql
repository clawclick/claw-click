-- Claw.Click Database Schema
-- PostgreSQL

-- Tokens table
CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL,
  symbol VARCHAR(12) NOT NULL,
  creator VARCHAR(42) NOT NULL,
  beneficiary VARCHAR(42) NOT NULL,
  agent_wallet VARCHAR(42),
  pool_id VARCHAR(66) NOT NULL,
  target_mcap DECIMAL(30,18) NOT NULL,
  current_mcap DECIMAL(30,18),
  current_price DECIMAL(36,18),
  sqrt_price_x96 DECIMAL(78,0),
  volume_24h DECIMAL(30,18) DEFAULT 0,
  volume_total DECIMAL(30,18) DEFAULT 0,
  price_change_24h DECIMAL(10,4) DEFAULT 0,
  tx_count_24h INTEGER DEFAULT 0,
  tx_count_total INTEGER DEFAULT 0,
  buys_24h INTEGER DEFAULT 0,
  sells_24h INTEGER DEFAULT 0,
  launched_at TIMESTAMP NOT NULL,
  graduated BOOLEAN DEFAULT FALSE,
  graduated_at TIMESTAMP,
  current_epoch INTEGER DEFAULT 1,
  current_position INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Swaps table
CREATE TABLE IF NOT EXISTS swaps (
  id SERIAL PRIMARY KEY,
  pool_id VARCHAR(66) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  trader VARCHAR(42) NOT NULL,
  amount_in DECIMAL(30,18),
  amount_out DECIMAL(30,18),
  is_buy BOOLEAN,
  fee_amount DECIMAL(30,18),
  tax_bps INTEGER,
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Platform stats table
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_tokens INTEGER DEFAULT 0,
  total_volume_eth DECIMAL(30,18) DEFAULT 0,
  total_volume_24h DECIMAL(30,18) DEFAULT 0,
  total_txs BIGINT DEFAULT 0,
  total_txs_24h INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial stats row
INSERT INTO stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tokens_launched_at ON tokens(launched_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_volume_24h ON tokens(volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_mcap ON tokens(current_mcap DESC);
CREATE INDEX IF NOT EXISTS idx_swaps_timestamp ON swaps(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_swaps_token ON swaps(token_address);
CREATE INDEX IF NOT EXISTS idx_swaps_block ON swaps(block_number);

-- Function to update token's updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
