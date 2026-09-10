import { pool } from '../client'

let compatibilityPromise: Promise<void> | null = null

const runPlanSchemaCompatibility = async () => {
  await pool.query(`
    ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS slug varchar(80),
      ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS commission_percentage numeric(5, 2) NOT NULL DEFAULT 0,
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

  // Standard plan commissions: A=10%, B=15% ... M=70%. Existing matching
  // plans are updated, and missing plans are added without changing the
  // seller's currently assigned plan.
  await pool.query(`
    WITH defaults(name, slug, commission_percentage, sort_order) AS (
      VALUES
        ('Plan A', 'plan-a', 10.00::numeric, 10),
        ('Plan B', 'plan-b', 15.00::numeric, 20),
        ('Plan C', 'plan-c', 20.00::numeric, 30),
        ('Plan D', 'plan-d', 25.00::numeric, 40),
        ('Plan E', 'plan-e', 30.00::numeric, 50),
        ('Plan F', 'plan-f', 35.00::numeric, 60),
        ('Plan G', 'plan-g', 40.00::numeric, 70),
        ('Plan H', 'plan-h', 45.00::numeric, 80),
        ('Plan I', 'plan-i', 50.00::numeric, 90),
        ('Plan J', 'plan-j', 55.00::numeric, 100),
        ('Plan K', 'plan-k', 60.00::numeric, 110),
        ('Plan L', 'plan-l', 65.00::numeric, 120),
        ('Plan M', 'plan-m', 70.00::numeric, 130)
    )
    UPDATE plans AS plan
    SET commission_percentage = defaults.commission_percentage,
        slug = COALESCE(NULLIF(plan.slug, ''), defaults.slug),
        sort_order = CASE WHEN plan.sort_order = 0 THEN defaults.sort_order ELSE plan.sort_order END,
        updated_at = now()
    FROM defaults
    WHERE lower(plan.name) = lower(defaults.name) OR plan.slug = defaults.slug;

    WITH defaults(name, slug, commission_percentage, sort_order) AS (
      VALUES
        ('Plan A', 'plan-a', 10.00::numeric, 10), ('Plan B', 'plan-b', 15.00::numeric, 20),
        ('Plan C', 'plan-c', 20.00::numeric, 30), ('Plan D', 'plan-d', 25.00::numeric, 40),
        ('Plan E', 'plan-e', 30.00::numeric, 50), ('Plan F', 'plan-f', 35.00::numeric, 60),
        ('Plan G', 'plan-g', 40.00::numeric, 70), ('Plan H', 'plan-h', 45.00::numeric, 80),
        ('Plan I', 'plan-i', 50.00::numeric, 90), ('Plan J', 'plan-j', 55.00::numeric, 100),
        ('Plan K', 'plan-k', 60.00::numeric, 110), ('Plan L', 'plan-l', 65.00::numeric, 120),
        ('Plan M', 'plan-m', 70.00::numeric, 130)
    )
    INSERT INTO plans (name, slug, description, commission_percentage, is_active, is_default, sort_order, created_at, updated_at)
    SELECT name, slug, commission_percentage::text || '% commission on courier cost', commission_percentage, true, false, sort_order, now(), now()
    FROM defaults
    WHERE NOT EXISTS (SELECT 1 FROM plans WHERE lower(plans.name) = lower(defaults.name) OR plans.slug = defaults.slug);
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
