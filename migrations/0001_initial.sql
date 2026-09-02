CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('ADR', 'Glossary', 'Product decision')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  version TEXT NOT NULL,
  notes TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(workspace_id, version)
);

CREATE INDEX IF NOT EXISTS entries_workspace_updated ON entries(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS releases_workspace_created ON releases(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS release_sources (
  release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  PRIMARY KEY (release_id, entry_id)
);
