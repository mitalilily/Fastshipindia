import assert from 'node:assert/strict'

process.env.DATABASE_URL ||= 'postgres://postgres@127.0.0.1:5432/fastship_test'

import {
  computeB2CRateCardCharge,
  mergeResolvedB2CRateCards,
  type ResolvedB2CRateCard,
} from '../models/services/b2cRateCard.service'
import { b2cRateSeeds } from './seedPdfRateCards'

type B2CRateSeed = (typeof b2cRateSeeds)[number]

const PDF_ZONE_C = 'C'

const buildRateCardFromPdfSeed = (seedId: number): ResolvedB2CRateCard => {
  const seed = b2cRateSeeds.find((entry: B2CRateSeed) => entry.id === seedId)
  assert.ok(seed, `Missing PDF B2C seed ${seedId}`)

  return {
    shippingRateId: `pdf-seed-${seed.id}`,
    courier_id: seed.id,
    courier_name: seed.name,
    service_provider: seed.serviceProvider,
    zone_id: 'zone-c',
    type: seed.type,
    mode: seed.mode,
    cod_charges: seed.codCharges,
    cod_percent: seed.codPercent,
    other_charges: 0,
    min_weight: seed.baseWeightKg,
    base_rate: seed.zones[PDF_ZONE_C],
    slabs: [
      {
        weight_from: 0,
        weight_to: seed.baseWeightKg,
        rate: seed.zones[PDF_ZONE_C],
        extra_rate: seed.additional[PDF_ZONE_C],
        extra_weight_unit: seed.additionalWeightKg,
      },
    ],
  }
}

const computeFreight = (rateCard: ResolvedB2CRateCard, weightG: number) =>
  computeB2CRateCardCharge({
    actual_weight_g: weightG,
    length_cm: 1,
    width_cm: 1,
    height_cm: 1,
    rateCard,
  })

const delhiverySurface05 = buildRateCardFromPdfSeed(2002)

for (const [weightG, expectedFreight] of [
  [500, 41],
  [1000, 75],
  [1500, 109],
  [2500, 177],
] as const) {
  const result = computeFreight(delhiverySurface05, weightG)
  assert.equal(result.freight, expectedFreight)
  assert.equal(result.max_slab_weight, 0.5)
  assert.equal(result.slab_weight, weightG === 500 ? null : 500)
  assert.equal(result.matched_by, weightG === 500 ? 'slab' : 'last_slab_extra')
}

const blueDartSurface05 = buildRateCardFromPdfSeed(2103)
const blueDartResult = computeFreight(blueDartSurface05, 2500)
assert.equal(blueDartResult.freight, 241)
assert.equal(blueDartResult.max_slab_weight, 0.5)
assert.equal(blueDartResult.slab_weight, 500)
assert.equal(blueDartResult.matched_by, 'last_slab_extra')

const delhiverySurface2Kg = buildRateCardFromPdfSeed(2006)
const mergedPdfRateCards = mergeResolvedB2CRateCards(
  [delhiverySurface05, delhiverySurface2Kg],
  { serviceProvider: 'delhivery' },
)

assert.equal(mergedPdfRateCards.length, 2)
assert.deepEqual(
  mergedPdfRateCards.map((rate) => rate.shippingRateId).sort(),
  ['pdf-seed-2002', 'pdf-seed-2006'],
)

for (const seed of b2cRateSeeds) {
  if (seed.type !== 'forward') continue
  const card = buildRateCardFromPdfSeed(seed.id)
  const result = computeFreight(card, Math.round(seed.baseWeightKg * 1000 + seed.additionalWeightKg * 1000))
  assert.equal(
    result.freight,
    seed.zones[PDF_ZONE_C] + seed.additional[PDF_ZONE_C],
    `${seed.name} Zone C additional slab was not used from the active PDF rate-card seed`,
  )
}

console.log('B2C PDF rate calculator verified for Delhivery Surface 0.5Kg, BlueDart Surface 0.5Kg, and all forward Zone C additional slabs.')
