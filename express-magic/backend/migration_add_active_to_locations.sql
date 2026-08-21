ALTER TABLE shiplifi_locations
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
