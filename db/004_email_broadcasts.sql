CREATE TABLE email_dispatches (
  content_id uuid PRIMARY KEY REFERENCES marketing_content(id) ON DELETE RESTRICT,
  workspace text NOT NULL CHECK (workspace IN ('foxyavenue','shapes-and-pieces')),
  resend_id text UNIQUE,
  state text NOT NULL CHECK (state IN ('submitting','scheduled','queued','sent','canceled','unknown','rejected')),
  subject text NOT NULL,
  sender text NOT NULL,
  segment_id text NOT NULL,
  scheduled_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_dispatches_workspace ON email_dispatches(workspace,created_at DESC);
