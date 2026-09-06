CREATE SEQUENCE IF NOT EXISTS pickup_code_seq START 1000;

ALTER TABLE pickup_addresses
ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(20);

WITH numbered_pickups AS (
  SELECT
    pa.id,
    999 + ROW_NUMBER() OVER (
      ORDER BY COALESCE(a."createdAt", NOW()), pa.id
    ) AS pickup_number
  FROM pickup_addresses pa
  LEFT JOIN addresses a ON a.id = pa."addressId"
  WHERE pa.pickup_code IS NULL OR pa.pickup_code = ''
)
UPDATE pickup_addresses pa
SET pickup_code = 'FS' || numbered_pickups.pickup_number::text
FROM numbered_pickups
WHERE pa.id = numbered_pickups.id;

SELECT setval(
  'pickup_code_seq',
  COALESCE(
    (
      SELECT MAX(substring(pickup_code FROM '^FS([0-9]+)$')::bigint) + 1
      FROM pickup_addresses
      WHERE pickup_code ~ '^FS[0-9]+$'
    ),
    1000
  ),
  false
);

ALTER TABLE pickup_addresses
ALTER COLUMN pickup_code SET DEFAULT 'FS' || nextval('pickup_code_seq')::text;

ALTER TABLE pickup_addresses
ALTER COLUMN pickup_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pickup_addresses_pickup_code_unique
ON pickup_addresses (pickup_code);
