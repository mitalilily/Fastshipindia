-- Hilly-region SDL (Special Delivery Location) rate card.
--
-- The source PDF quotes SDL as Rs/kg by origin zone, not as one fixed
-- pincode charge. Rates are therefore seeded as editable B2B surcharge rules.
-- In Admin -> Pricing & Zones -> B2B -> Surcharges, edit a rule whose code
-- starts with SDL_HILLY_ to change its amount or disable it.

UPDATE shiplifi_b2b_pincodes
SET is_sdl_zone = true,
    updated_at = NOW()
WHERE UPPER(TRIM(state)) IN (
  'HIMACHAL PRADESH', 'JAMMU & KASHMIR', 'JAMMU AND KASHMIR',
  'ARUNACHAL PRADESH', 'ASSAM', 'MANIPUR', 'MEGHALAYA', 'MIZORAM',
  'NAGALAND', 'SIKKIM', 'TRIPURA'
);

-- N1, N2, E, NE, W1, W2, S1, S2 and Central values from the supplied PDF.
-- E/NE/Central are matched to both corresponding operational sub-zones.
INSERT INTO shiplifi_b2b_overhead_rules
  (code, name, description, type, amount, applies_to, condition, priority,
   business_type, is_active, created_at, updated_at)
VALUES
  ('SDL_HILLY_HPJK_N1', 'SDL Hilly - Himachal/J&K - N1', 'Hilly SDL rate card', 'per_kg', 11.60, 'freight', '{"sdlZone":true,"originZones":["N1"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_HPJK_N2', 'SDL Hilly - Himachal/J&K - N2', 'Hilly SDL rate card', 'per_kg', 11.50, 'freight', '{"sdlZone":true,"originZones":["N2"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_HPJK_E', 'SDL Hilly - Himachal/J&K - East', 'Hilly SDL rate card', 'per_kg', 16.40, 'freight', '{"sdlZone":true,"originZones":["E1","E2"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_HPJK_NE', 'SDL Hilly - Himachal/J&K - North East', 'Hilly SDL rate card', 'per_kg', 22.30, 'freight', '{"sdlZone":true,"originZones":["NE1","NE2"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_HPJK_W1', 'SDL Hilly - Himachal/J&K - W1', 'Hilly SDL rate card', 'per_kg', 18.00, 'freight', '{"sdlZone":true,"originZones":["W1"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_HPJK_W2', 'SDL Hilly - Himachal/J&K - W2', 'Hilly SDL rate card', 'per_kg', 19.00, 'freight', '{"sdlZone":true,"originZones":["W2"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_HPJK_S1', 'SDL Hilly - Himachal/J&K - S1', 'Hilly SDL rate card', 'per_kg', 20.30, 'freight', '{"sdlZone":true,"originZones":["S1"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_HPJK_S2', 'SDL Hilly - Himachal/J&K - S2', 'Hilly SDL rate card', 'per_kg', 24.70, 'freight', '{"sdlZone":true,"originZones":["S2"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_HPJK_C', 'SDL Hilly - Himachal/J&K - Central', 'Hilly SDL rate card', 'per_kg', 14.70, 'freight', '{"sdlZone":true,"originZones":["C1","C2"],"destinationStates":["HIMACHAL PRADESH","JAMMU & KASHMIR","JAMMU AND KASHMIR"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_N1', 'SDL Hilly - North East - N1', 'Hilly SDL rate card', 'per_kg', 23.80, 'freight', '{"sdlZone":true,"originZones":["N1"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_N2', 'SDL Hilly - North East - N2', 'Hilly SDL rate card', 'per_kg', 27.00, 'freight', '{"sdlZone":true,"originZones":["N2"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_E', 'SDL Hilly - North East - East', 'Hilly SDL rate card', 'per_kg', 19.60, 'freight', '{"sdlZone":true,"originZones":["E1","E2"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_NE', 'SDL Hilly - North East - North East', 'Hilly SDL rate card', 'per_kg', 13.80, 'freight', '{"sdlZone":true,"originZones":["NE1","NE2"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_W1', 'SDL Hilly - North East - W1', 'Hilly SDL rate card', 'per_kg', 28.60, 'freight', '{"sdlZone":true,"originZones":["W1"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_W2', 'SDL Hilly - North East - W2', 'Hilly SDL rate card', 'per_kg', 26.10, 'freight', '{"sdlZone":true,"originZones":["W2"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_S1', 'SDL Hilly - North East - S1', 'Hilly SDL rate card', 'per_kg', 26.10, 'freight', '{"sdlZone":true,"originZones":["S1"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_S2', 'SDL Hilly - North East - S2', 'Hilly SDL rate card', 'per_kg', 29.40, 'freight', '{"sdlZone":true,"originZones":["S2"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW()),
  ('SDL_HILLY_NE_C', 'SDL Hilly - North East - Central', 'Hilly SDL rate card', 'per_kg', 27.40, 'freight', '{"sdlZone":true,"originZones":["C1","C2"],"destinationStates":["ARUNACHAL PRADESH","ASSAM","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","SIKKIM","TRIPURA"]}', 10, 'B2B', true, NOW(), NOW())
ON CONFLICT (code, courier_id, service_provider) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, type = EXCLUDED.type,
    amount = EXCLUDED.amount, applies_to = EXCLUDED.applies_to, condition = EXCLUDED.condition,
    priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = NOW();
