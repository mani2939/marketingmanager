CREATE TABLE ugc_videos (
  id uuid PRIMARY KEY,
  workspace text NOT NULL CHECK (workspace IN ('foxyavenue','shapes-and-pieces')),
  title text NOT NULL,
  image_url text NOT NULL,
  motion_prompt text NOT NULL,
  hook text NOT NULL,
  voiceover text NOT NULL,
  caption text NOT NULL,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','submitting','rendering','storing','ready','failed','uncertain')),
  provider_job_id text UNIQUE,
  video_url text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ugc_videos_workspace_created ON ugc_videos(workspace,created_at DESC);
