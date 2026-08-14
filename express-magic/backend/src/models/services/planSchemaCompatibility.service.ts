import { pool } from '../client'

let compatibilityPromise: Promise<void> | null = null

const runPlanSchemaCompatibility = async () => {
  await pool.query(`
    ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS slug varchar(80),
      ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
  `)

  await pool.query(`
    UPDATE plans
    SET slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
    WHERE slug IS NULL OR btrim(slug) = '';
  `)

  await pool.query(`
    UPDATE plans
    SET slug = 'plan-' || left(id::text, 8)
    WHERE slug IS NULL OR btrim(slug) = '';
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM plans WHERE is_default = true) THEN
        UPDATE plans
        SET is_default = true, is_active = true
        WHERE id = COALESCE(
          (SELECT id FROM plans WHERE lower(name) IN ('basic', 'silver') ORDER BY created_at LIMIT 1),
          (SELECT id FROM plans ORDER BY created_at LIMIT 1)
        );
      END IF;
    END $$;
  `)
}

export const ensurePlanSchemaCompatibility = async () => {
  if (!compatibilityPromise) {
    compatibilityPromise = runPlanSchemaCompatibility().catch((error) => {
      compatibilityPromise = null
      throw error
    })
  }

  return compatibilityPromise
}
