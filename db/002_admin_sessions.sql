-- Opaque session tokens are hashed before storage. Passwords never enter the database.
CREATE TABLE IF NOT EXISTS strozpy_sessions (
  token_hash text PRIMARY KEY,
  username text NOT NULL,
  credential_version text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS strozpy_sessions_expiry ON strozpy_sessions(expires_at);
CREATE TABLE IF NOT EXISTS strozpy_login_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  resets_at timestamptz NOT NULL
);
