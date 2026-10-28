CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY NOT NULL, label TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS oauth_states_expiry ON oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS seller_tokens (label TEXT PRIMARY KEY NOT NULL, open_id TEXT NOT NULL, encrypted_json TEXT NOT NULL, updated_at INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS creator_oauth_states (
  state TEXT PRIMARY KEY NOT NULL, alias TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS creator_states_expiry ON creator_oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS creator_tokens (
  open_id TEXT PRIMARY KEY NOT NULL, alias TEXT NOT NULL,
  encrypted_json TEXT NOT NULL, granted_scopes TEXT NOT NULL,
  status TEXT NOT NULL, updated_at INTEGER NOT NULL, last_checked_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS creator_tokens_checked ON creator_tokens(last_checked_at);
