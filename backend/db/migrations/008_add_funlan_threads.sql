-- FUNLAN Thread messages & votes
-- Stores posts and replies for the FUNLAN thread page

-- Posts table (top-level messages)
CREATE TABLE IF NOT EXISTS funlan_posts (
  id SERIAL PRIMARY KEY,
  wallet VARCHAR(42) NOT NULL,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES funlan_posts(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Votes table (prevents double-voting)
CREATE TABLE IF NOT EXISTS funlan_votes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES funlan_posts(id) ON DELETE CASCADE,
  wallet VARCHAR(42) NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, wallet)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_funlan_posts_parent ON funlan_posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_funlan_posts_wallet ON funlan_posts(wallet);
CREATE INDEX IF NOT EXISTS idx_funlan_posts_created ON funlan_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funlan_votes_post ON funlan_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_funlan_votes_wallet ON funlan_votes(wallet);
