-- ============================================================
-- Seed exact B2B zone matrix catalog from the MOVIN/DELHIVERY/XP India matrix
-- ============================================================

INSERT INTO shiplifi_zones
  (id, code, name, description, region, business_type, metadata, states, created_at, updated_at)
VALUES
  ('cae65ad9-2c06-4a9f-a91f-400aaf763013', 'N1', 'Zone N1', 'DELHI, FBD, GZB, GGN, NOIDA', 'N1', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["DELHI"]'::jsonb, now(), now()),
  ('ddc1286b-211e-436f-a0f2-d98f78b4e5c7', 'N2', 'Zone N2', 'HR, PB, RJ, UP, UK', 'N2', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["HARYANA","PUNJAB","RAJASTHAN","UTTAR PRADESH","UTTARAKHAND"]'::jsonb, now(), now()),
  ('208ee5d2-ae72-4a2a-bcd5-fe9caf41e3e8', 'N3', 'Zone N3', 'HIMACHAL PRADESH, JAMMU & KASHMIR', 'N3', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]'::jsonb, now(), now()),
  ('d0da9b67-df31-416f-802a-c610c57618fd', 'C1', 'Zone C1', 'BHOPAL, INDORE, RAIPUR', 'C1', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '[]'::jsonb, now(), now()),
  ('77f482cf-01e5-47ea-a2b6-9d6a756e80b9', 'C2', 'Zone C2', 'CHHATTISGARH, MADHYA PRADESH', 'C2', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["CHHATTISGARH","MADHYA PRADESH"]'::jsonb, now(), now()),
  ('d828ac51-a8f0-48e2-98db-1e7003264bc8', 'W1', 'Zone W1', 'MUM, PUNE, AHMADABAD, BARODA, BHIWANDI, THANE', 'W1', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '[]'::jsonb, now(), now()),
  ('9d523666-b793-445b-a10c-9f1b219dcdc7', 'W2', 'Zone W2', 'GUJRAT, GOA, MH, DAMAN & DIU, DADRA HAVELI', 'W2', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["GUJARAT","GOA","MAHARASHTRA","DAMAN & DIU","DADRA AND NAGAR HAVELI"]'::jsonb, now(), now()),
  ('91630d1c-0a19-4cd6-bb59-e3df93092df6', 'E1', 'Zone E1', 'PATNA, KOLKATA, JAMSHEDPUR, BHUBANESWAR', 'E1', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '[]'::jsonb, now(), now()),
  ('9d154a85-1db9-4543-b711-40e2f55df88b', 'E2', 'Zone E2', 'BIHAR, JHARKHAND, ODISHA, WEST BENGAL', 'E2', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["BIHAR","JHARKHAND","ODISHA","WEST BENGAL"]'::jsonb, now(), now()),
  ('d674dddd-b83e-495f-b670-ea8656910f50', 'S1', 'Zone S1', 'BANGALORE, CHENNAI, HYDRABAD, SECUNDRABAD, SRIPERUMBUDUR', 'S1', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '[]'::jsonb, now(), now()),
  ('3e6ec6a2-582a-46a7-84a2-3d27ccab0628', 'S2', 'Zone S2', 'ANDHRA PRADESH, KARNATAKA, TAMIL NADU, TELANGANA', 'S2', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["ANDHRA PRADESH","KARNATAKA","TAMIL NADU","TELANGANA"]'::jsonb, now(), now()),
  ('0363dd05-dc0c-4740-a0a0-a9c6341a8eff', 'S3', 'Zone S3', 'KERLA, PONDICHERRY', 'S3', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["KERALA","PUDUCHERRY"]'::jsonb, now(), now()),
  ('f26e0454-465a-4489-8c14-b556d27bb18b', 'NE1', 'Zone NE1', 'GUWAHATI', 'NE1', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '[]'::jsonb, now(), now()),
  ('270b3fe2-6639-40cc-8622-9ec9e6934349', 'NE2', 'Zone NE2', 'ARUNACHAL, ASSAM, MANIPUR, MEGHALAYA, MIZORAM, NAGALAND, SIKKIM, TRIPURA', 'NE2', 'B2B', '{"source":"MOVIN/DELHIVERY/XP India parcel matrix"}'::jsonb, '["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]'::jsonb, now(), now())
ON CONFLICT (code, business_type) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    region = EXCLUDED.region,
    metadata = EXCLUDED.metadata,
    states = EXCLUDED.states,
    updated_at = now();

-- This migration intentionally does not delete legacy B2B zones.
-- Review existing pincode/rate assignments before retiring A_B2B/B_B2B/etc. rows.
