CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY,
  name VARCHAR(32) UNIQUE NOT NULL,
  max_file_size BIGINT NOT NULL,
  daily_limit INTEGER,
  ocr_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  batch_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan VARCHAR(32) NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  input_format VARCHAR(24) NOT NULL,
  output_format VARCHAR(24),
  tool VARCHAR(64),
  file_size BIGINT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'uploaded',
  progress INTEGER NOT NULL DEFAULT 0,
  source_files JSONB NOT NULL,
  output_storage_key TEXT,
  output_filename TEXT,
  download_url TEXT,
  error_message TEXT,
  job_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversions_user_created ON conversions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_expired ON conversions(expired_at);
