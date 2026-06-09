-- AICITY Live — SQLite schema (Phase 5)
-- Persists city state across server restarts.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── City meta ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed initial values (INSERT OR IGNORE so restarts don't overwrite)
INSERT OR IGNORE INTO city_meta VALUES ('city_name',   'AICITY Live');
INSERT OR IGNORE INTO city_meta VALUES ('founding_day','1');
INSERT OR IGNORE INTO city_meta VALUES ('day_number',  '1');
INSERT OR IGNORE INTO city_meta VALUES ('population',  '4200');
INSERT OR IGNORE INTO city_meta VALUES ('buildings',   '81');

-- ── Districts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS districts (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  mood       TEXT NOT NULL,
  unlocked   INTEGER NOT NULL DEFAULT 0,
  unlock_day INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO districts VALUES ('downtown',  'Downtown Core',    'busy',        1, 1);
INSERT OR IGNORE INTO districts VALUES ('maple',     'Maple Quarter',    'residential', 1, 1);
INSERT OR IGNORE INTO districts VALUES ('harbor',    'Harbor District',  'commercial',  1, 1);
INSERT OR IGNORE INTO districts VALUES ('midtown',   'Midtown',          'commercial',  1, 1);
INSERT OR IGNORE INTO districts VALUES ('ironworks', 'Ironworks',        'industrial',  0, 3);
INSERT OR IGNORE INTO districts VALUES ('greenway',  'Greenway',         'park',        0, 6);

-- ── Construction projects ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS construction (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_x            INTEGER NOT NULL,
  chunk_y            INTEGER NOT NULL,
  label              TEXT NOT NULL,
  start_day          INTEGER NOT NULL,
  completion_day     INTEGER NOT NULL,
  complete           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO construction (id, chunk_x, chunk_y, label, start_day, completion_day, complete)
  VALUES (1, 2, 8, 'Ironworks Expansion Wing', 1, 5, 0);

-- ── Landmarks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS landmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  chunk_x     INTEGER NOT NULL,
  chunk_y     INTEGER NOT NULL,
  district_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  named_by    TEXT,          -- viewer channel ID who named it
  named_at    TEXT
);

INSERT OR IGNORE INTO landmarks (id, name, chunk_x, chunk_y, district_id, description)
VALUES
  (1,  'City Hall Plaza',  3, 3, 'downtown',  'Heart of civic life'),
  (2,  'Central Tower',    3, 4, 'downtown',  'Tallest building'),
  (3,  'Arena Square',     4, 4, 'downtown',  'Public square'),
  (4,  'The Anchor Cafe',  8, 0, 'harbor',    'Famous waterfront coffee'),
  (5,  'Harbor Market',    6, 0, 'harbor',    'Daily fresh produce'),
  (6,  'Ironworks Plant',  0, 6, 'ironworks', 'Industrial backbone'),
  (7,  'Festival Plaza',   7, 7, 'greenway',  'Events and fireworks'),
  (8,  'Maple Park',       1, 1, 'maple',     'Quiet neighborhood green'),
  (9,  'Southside Brew',   4, 7, 'midtown',   'Popular coffee shop'),
  (10, 'City Green',       6, 6, 'greenway',  'Largest park');

-- ── Viewer contributions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS viewer_contributions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id   TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  action       TEXT NOT NULL,   -- 'named', 'voted', 'mayor', 'superchat'
  target       TEXT NOT NULL,
  day_number   INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Mayor history ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mayors (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id   TEXT NOT NULL,
  author_name  TEXT NOT NULL DEFAULT 'Unknown',
  elected_at   TEXT NOT NULL DEFAULT (datetime('now')),
  day_number   INTEGER NOT NULL DEFAULT 1
);

-- ── Vote history ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vote_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id    TEXT NOT NULL,
  winner     TEXT NOT NULL,
  total_votes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Chat log (last 24h kept) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id   TEXT UNIQUE,
  channel_id   TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  text         TEXT NOT NULL,
  is_superchat INTEGER NOT NULL DEFAULT 0,
  amount       REAL,
  published_at TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_log(created_at);
CREATE INDEX IF NOT EXISTS idx_contributions_channel ON viewer_contributions(channel_id);
