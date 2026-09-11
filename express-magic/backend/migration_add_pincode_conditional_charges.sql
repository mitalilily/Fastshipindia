-- Conditional B2B charges: enabled per pincode and configured per courier/plan scope.
ALTER TABLE shiplifi_b2b_pincodes
  ADD COLUMN IF NOT EXISTS is_fm_charge boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_to_pay_charge boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_green_tax boolean NOT NULL DEFAULT false;

ALTER TABLE shiplifi_b2b_additional_charges
  ADD COLUMN IF NOT EXISTS fm_charge_per_awb NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fm_charge_per_kg NUMERIC(12, 4) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS fm_charge_method varchar(30) NOT NULL DEFAULT 'whichever_is_higher',
  ADD COLUMN IF NOT EXISTS to_pay_fixed_amount NUMERIC(12, 2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS to_pay_percentage NUMERIC(8, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS to_pay_method varchar(30) NOT NULL DEFAULT 'whichever_is_higher',
  ADD COLUMN IF NOT EXISTS green_tax_per_kg NUMERIC(12, 4) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS green_tax_method varchar(30) NOT NULL DEFAULT 'whichever_is_higher';

-- Bring legacy global rows to the agreed Green Tax default. The pincode switch
-- still controls whether it is charged on a shipment.
UPDATE shiplifi_b2b_additional_charges
SET green_tax = 100
WHERE COALESCE(green_tax, 0) = 0;

CREATE INDEX IF NOT EXISTS idx_b2b_pincodes_fm_charge ON shiplifi_b2b_pincodes (is_fm_charge) WHERE is_fm_charge = true;
CREATE INDEX IF NOT EXISTS idx_b2b_pincodes_to_pay_charge ON shiplifi_b2b_pincodes (is_to_pay_charge) WHERE is_to_pay_charge = true;
CREATE INDEX IF NOT EXISTS idx_b2b_pincodes_green_tax ON shiplifi_b2b_pincodes (is_green_tax) WHERE is_green_tax = true;
