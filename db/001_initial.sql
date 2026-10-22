-- Run once before enabling draft persistence. Idempotent; never runs during builds.
CREATE TABLE IF NOT EXISTS marketing_content (
  id uuid PRIMARY KEY,
  workspace text NOT NULL CHECK (workspace IN ('shapes-and-pieces', 'foxyavenue')),
  kind text NOT NULL CHECK (kind IN ('post','reel','email','blog')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  channel text NOT NULL CHECK (channel IN ('Instagram','TikTok','Facebook','Email','Website')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','planned')),
  scheduled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  CHECK (status <> 'planned' OR scheduled_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS content_workspace_updated ON marketing_content(workspace, updated_at DESC);
CREATE INDEX IF NOT EXISTS content_planned_at ON marketing_content(scheduled_at) WHERE status = 'planned';
