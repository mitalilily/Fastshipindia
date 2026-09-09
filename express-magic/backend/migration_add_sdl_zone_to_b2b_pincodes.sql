-- ============================================================
-- Add SDL zone attributes to B2B pincode mappings
-- ============================================================
-- Table: shiplifi_b2b_pincodes
-- ============================================================

ALTER TABLE shiplifi_b2b_pincodes
  ADD COLUMN IF NOT EXISTS is_sdl_zone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sdl_rate_per_kg NUMERIC(12, 4);

CREATE INDEX IF NOT EXISTS idx_b2b_pincodes_sdl_zone
  ON shiplifi_b2b_pincodes (is_sdl_zone)
  WHERE is_sdl_zone = true;

-- ============================================================
-- Verify:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'shiplifi_b2b_pincodes'
--   AND column_name IN ('is_sdl_zone', 'sdl_rate_per_kg');
-- ============================================================
