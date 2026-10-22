CREATE TABLE social_accounts (
 id uuid PRIMARY KEY, workspace text NOT NULL CHECK (workspace IN ('foxyavenue','shapes-and-pieces')),
 provider text NOT NULL CHECK (provider IN ('instagram','facebook','tiktok','youtube')),
 account_id text NOT NULL, name text NOT NULL, credentials text NOT NULL,
 status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','reconnect','error')),
 last_synced_at timestamptz, last_error text, sync_started_at timestamptz, sync_lease uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace,provider,account_id)
);
CREATE TABLE social_oauth_flows (
 state_hash text PRIMARY KEY, session_hash text NOT NULL, workspace text NOT NULL,
 provider text NOT NULL, verifier text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE social_pending_connections (
 id uuid PRIMARY KEY, session_hash text NOT NULL, workspace text NOT NULL,
 candidates text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE social_posts (
 account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
 post_id text NOT NULL, title text NOT NULL, url text, thumbnail text,
 published_at timestamptz NOT NULL, metrics jsonb NOT NULL, warning text,
 fetched_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(account_id,post_id)
);
CREATE INDEX social_posts_latest ON social_posts(account_id,published_at DESC);
