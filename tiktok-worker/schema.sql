CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY NOT NULL, label TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS oauth_states_expiry ON oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS seller_tokens (label TEXT PRIMARY KEY NOT NULL, open_id TEXT NOT NULL, encrypted_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
