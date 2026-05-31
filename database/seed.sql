CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO plans (id, name, max_file_size, daily_limit, ocr_enabled, batch_enabled, price)
VALUES
  (gen_random_uuid(), 'free', 10485760, 5, false, false, 0),
  (gen_random_uuid(), 'pro', 104857600, NULL, true, false, 12),
  (gen_random_uuid(), 'business', 524288000, NULL, true, true, 39)
ON CONFLICT (name) DO NOTHING;
