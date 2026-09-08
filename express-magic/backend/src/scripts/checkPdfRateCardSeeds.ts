import assert from 'node:assert/strict'
import {
  b2bMatrix,
  b2bZoneCodes,
  b2cRateSeeds,
  holzerB2BMatrix,
  holzerB2BZoneCodes,
} from './seedPdfRateCards'

type ExpectedB2CSeed = [
  number,
  string,
  string,
  string,
  'forward' | 'reverse_pickup',
  number,
  number,
  number,
  number,
  [number, number, number, number, number],
  [number, number, number, number, number],
]

const expectedB2CSeeds: ExpectedB2CSeed[] = [
  [2001, 'Delhivery Air', 'delhivery', 'air', 'forward', 0.5, 0.5, 33, 1.7, [34, 52, 55, 58, 72], [31, 35, 49, 49, 64]],
  [2002, 'Delhivery Surface 0.5Kg', 'delhivery', 'surface', 'forward', 0.5, 0.5, 33, 1.7, [27, 36, 41, 44, 57], [22, 29, 34, 36, 50]],
  [2003, 'Delhivery Heavy MPS 10Kg', 'delhivery', 'surface', 'forward', 10, 1, 38, 1.8, [190, 235, 278, 267, 396], [18, 22, 26, 29, 39]],
  [2004, 'Delhivery Surface 5Kg', 'delhivery', 'surface', 'forward', 5, 1, 38, 1.8, [136, 146, 158, 179, 210], [26, 28, 30, 35, 41]],
  [2005, 'Delhivery Heavy MPS 20Kg', 'delhivery', 'surface', 'forward', 20, 1, 38, 1.8, [350, 420, 490, 520, 720], [16, 20, 23, 27, 32]],
  [2006, 'Delhivery 2Kg', 'delhivery', 'surface', 'forward', 2, 1, 30, 1.5, [78, 87, 95, 99, 126], [30, 32, 34, 35, 51]],
  [2007, 'Delhivery 1Kg', 'delhivery', 'surface', 'forward', 1, 0.5, 32, 1.7, [60, 65, 70, 74, 95], [25, 30, 35, 36, 48]],
  [2101, 'BlueDart Air 0.5Kg', 'bluedart', 'air', 'forward', 0.5, 0.5, 28, 1.6, [40, 48, 52, 55, 74], [38, 44.5, 44.5, 49, 71]],
  [2102, 'BlueDart Air 1Kg+', 'bluedart', 'air', 'forward', 1, 0.5, 31, 1.6, [75, 91, 95, 99, 140], [36, 42, 42, 46, 66]],
  [2103, 'BlueDart Surface 0.5Kg', 'bluedart', 'surface', 'forward', 0.5, 0.5, 27, 1.5, [43, 45, 49, 51, 67], [42, 44, 48, 49, 65]],
  [2104, 'BlueDart 2Kg', 'bluedart', 'surface', 'forward', 2, 1, 27, 1.6, [63, 71, 81, 88, 120], [28, 32, 35, 37, 45]],
  [2105, 'BlueDart Air Prime 0.5Kg', 'bluedart', 'air', 'forward', 0.5, 0.5, 27, 1.5, [35, 43, 47, 50, 68], [35, 41, 44, 46, 65]],
  [2106, 'BlueDart 1Kg+', 'bluedart', 'surface', 'forward', 1, 0.5, 27, 1.5, [85, 88, 95, 99, 132], [42, 44, 48, 48, 65]],
  [2107, 'BlueDart Surface Prime 0.5Kg', 'bluedart', 'surface', 'forward', 0.5, 0.5, 27, 1.5, [38, 40, 43, 46, 60], [38, 40, 43, 45, 60]],
  [2201, 'XpressBees 0.5Kg', 'xpressbees', 'surface', 'forward', 0.5, 0.5, 27, 1.7, [28, 32, 35, 41, 56], [16, 19, 23, 28, 38]],
  [2202, 'XpressBees 5Kg', 'xpressbees', 'surface', 'forward', 5, 1, 30, 1.8, [115, 115, 150, 150, 189], [20, 20, 30, 30, 40]],
  [2203, 'XpressBees 10Kg', 'xpressbees', 'surface', 'forward', 10, 1, 30, 1.5, [159, 198, 266, 275, 360], [16, 20, 26, 29, 36]],
  [2204, 'XpressBees 1Kg', 'xpressbees', 'surface', 'forward', 1, 0.5, 26, 1.5, [34, 42, 49, 58, 75], [17, 21, 25, 29, 35]],
  [2205, 'XpressBees 2Kg', 'xpressbees', 'surface', 'forward', 2, 1, 30, 1.6, [50, 60, 72, 78, 99], [25, 30, 36, 39, 50]],
  [2301, 'Amazon ATS 0.5Kg', 'amazon', 'surface', 'forward', 0.5, 0.5, 25, 1.5, [28, 32, 35, 38, 48], [17, 25, 25, 21.3, 34]],
  [2302, 'Amazon ATS 2Kg', 'amazon', 'surface', 'forward', 2, 1, 25, 1.5, [44, 53, 63, 68, 94], [18, 20, 21, 25, 31]],
  [2303, 'Amazon ATS 10Kg', 'amazon', 'surface', 'forward', 10, 1, 25, 1.5, [178, 200, 220, 249, 338], [12, 13, 14, 16, 21]],
  [2401, 'DTDC Surface 0.5Kg', 'dtdc', 'surface', 'forward', 0.5, 0.5, 28, 1.6, [26, 34, 40, 46, 55], [23, 31, 36, 41, 48]],
  [2501, 'TCI Express 5Kg+', 'tci', 'surface', 'forward', 5, 1, 30, 1.5, [126, 152, 173, 180, 216], [24, 29, 32, 33, 45]],
  [2601, 'Shadowfax 0.5Kg', 'shadowfax', 'surface', 'forward', 0.5, 0.5, 26, 1.65, [24, 31, 33, 39, 48], [20, 24, 27, 29, 38]],
  [2602, 'Shadowfax 2Kg', 'shadowfax', 'surface', 'forward', 2, 1, 26, 1.5, [50, 50, 50, 50, 98], [21, 24, 27, 33, 36]],
  [2701, 'Ekart 0.5Kg', 'ekart', 'surface', 'forward', 0.5, 0.5, 27.5, 1.5, [29, 33, 36, 37, 52], [19, 25, 25, 28, 37]],
  [2702, 'Ekart 1Kg', 'ekart', 'surface', 'forward', 1, 0.5, 25.5, 1.8, [43, 49, 55, 60, 79], [15, 15, 19, 21, 27]],
  [2703, 'Ekart 5Kg', 'ekart', 'surface', 'forward', 5, 1, 30, 1.5, [100, 130, 140, 140, 210], [18, 24, 24, 28, 40]],
  [2704, 'Ekart Air', 'ekart', 'air', 'forward', 0.5, 0.5, 32, 1.6, [28, 34, 55, 60, 68], [12, 16, 35, 38, 50]],
  [2705, 'Ekart Flat Price', 'ekart', 'surface', 'forward', 0.5, 0.5, 0, 1, [62, 62, 62, 62, 62], [10, 10, 10, 10, 10]],
  [2801, 'Movin Air 5Kg', 'movin', 'air', 'forward', 5, 1, 0, 0, [325, 360, 360, 444, 630], [65, 72, 72, 89, 126]],
  [2901, 'IndiaPost SpeedPost', 'indiapost', 'surface', 'forward', 0.5, 0.5, 28, 2, [30, 60, 70, 80, 90], [10, 30, 30, 40, 50]],
  [2902, 'IndiaPost Business Parcel', 'indiapost', 'surface', 'forward', 2, 1, 70, 2.1, [45, 88, 105, 115, 115], [12, 24, 28, 34, 38]],
  [2008, 'Delhivery Heavy MPS Reverse', 'delhivery', 'surface', 'reverse_pickup', 10, 1, 0, 0, [260, 306, 370, 390, 540], [23, 28, 32, 36, 50]],
  [2706, 'Ekart 0.5Kg Reverse', 'ekart', 'surface', 'reverse_pickup', 0.5, 0.5, 0, 0, [70, 75, 80, 90, 99], [25, 30, 35, 40, 50]],
]

const expectedB2BMatrix: Record<(typeof b2bZoneCodes)[number], number[]> = {
  N1: [6.9, 6.9, 6.9, 7.3, 11.1, 11.1, 8.9, 10, 14, 14, 14, 15.3, 13, 13, 17.6, 17.6],
  N2: [6.9, 6.9, 6.9, 7.3, 11.1, 11.1, 8.9, 10, 14.8, 14.8, 14.8, 17.5, 13, 13, 17.6, 17.6],
  N3: [6.9, 6.9, 6.9, 7.3, 11.1, 11.1, 8.9, 10, 14.8, 14.8, 14.8, 17.5, 13, 13, 17.6, 17.6],
  N4: [7.4, 7.4, 7.4, 7, 11.3, 11.3, 10.5, 10.8, 14.8, 14.8, 14.8, 17.5, 13.4, 13.4, 19.2, 19.2],
  C1: [9.4, 9.4, 9.4, 10, 7, 7, 7.8, 8.9, 10.4, 10.4, 10.4, 15.5, 11.1, 11.1, 17.3, 17.3],
  C2: [9.4, 9.4, 9.4, 10, 7, 7, 7.8, 8.9, 10.4, 10.4, 10.4, 15.5, 11.1, 11.1, 17.3, 17.3],
  W1: [9.7, 9.7, 9.7, 10.5, 9.9, 9.9, 6.7, 8.9, 11.8, 11.8, 11.8, 15, 15.5, 15.5, 18.9, 18.9],
  W2: [10, 10, 10, 11.1, 8.9, 8.9, 7.2, 6.1, 8.9, 8.9, 8.9, 13.3, 15.5, 15.5, 18.9, 18.9],
  S1: [12.2, 12.2, 12.2, 12.8, 9.2, 9.2, 10.5, 8.9, 7.8, 7.8, 7.8, 9.4, 12.8, 12.8, 16.7, 16.7],
  S2: [12.2, 12.2, 12.2, 12.8, 9.2, 9.2, 10.5, 8.9, 7.8, 7.8, 7.8, 9.4, 12.8, 12.8, 16.7, 16.7],
  S3: [12.2, 12.2, 12.2, 12.8, 9.2, 9.2, 10.5, 8.9, 7.8, 7.8, 7.8, 9.4, 12.8, 12.8, 16.7, 16.7],
  S4: [12.8, 12.8, 12.8, 14.9, 9.8, 9.8, 10.7, 10.9, 7, 7, 7, 7.2, 13.3, 13.3, 18.9, 18.9],
  E1: [10.5, 10.5, 10.5, 11.7, 10.7, 10.7, 10.5, 10.9, 14.9, 14.9, 14.9, 15.5, 7.2, 7.2, 11.1, 11.1],
  E2: [10.5, 10.5, 10.5, 11.7, 10.7, 10.7, 10.5, 10.9, 14.9, 14.9, 14.9, 15.5, 7.2, 7.2, 11.1, 11.1],
  NE1: [11.1, 11.1, 11.1, 14.8, 10.9, 10.9, 11.7, 13.3, 13.7, 13.7, 13.7, 15.3, 9.9, 9.9, 7.2, 7.2],
  NE2: [11.1, 11.1, 11.1, 14.8, 10.9, 10.9, 11.7, 13.3, 13.7, 13.7, 13.7, 15.3, 9.9, 9.9, 7.2, 7.2],
}

const zoneKeys = ['A', 'B', 'C', 'D', 'E'] as const

const b2cById = new Map(b2cRateSeeds.map((seed) => [seed.id, seed]))
assert.equal(b2cById.size, expectedB2CSeeds.length + 1)

for (const [id, name, provider, mode, type, baseWeight, additionalWeight, codCharge, codPercent, zones, additional] of expectedB2CSeeds) {
  const seed = b2cById.get(id)
  assert.ok(seed, `Missing B2C PDF seed ${id} ${name}`)
  assert.equal(seed.name, name)
  assert.equal(seed.serviceProvider, provider)
  assert.equal(seed.mode, mode)
  assert.equal(seed.type, type)
  assert.equal(seed.baseWeightKg, baseWeight)
  assert.equal(seed.additionalWeightKg, additionalWeight)
  assert.equal(seed.codCharges, codCharge)
  assert.equal(seed.codPercent, codPercent)
  assert.deepEqual(zoneKeys.map((zone) => seed.zones[zone]), zones, `${name} zone rates changed`)
  assert.deepEqual(zoneKeys.map((zone) => seed.additional[zone]), additional, `${name} additional rates changed`)
}

for (const zone of b2bZoneCodes) {
  assert.deepEqual(b2bMatrix[zone], expectedB2BMatrix[zone], `B2B Delhivery matrix row ${zone} changed`)
}

const holzerN1Rates = [9, 15, 18, 17, 18, 20, 21, 21, 22, 21, 22, 23, 29, 34]
assert.deepEqual(holzerB2BZoneCodes, ['N1', 'N2', 'N3', 'C1', 'C2', 'W1', 'W2', 'E1', 'E2', 'S1', 'S2', 'S3', 'NE1', 'NE2'])
assert.deepEqual(holzerB2BMatrix.N1, holzerN1Rates, 'Holzer parcel matrix row N1 changed')

const holzerBlueDart = b2cById.get(3104)
assert.ok(holzerBlueDart, 'Missing Holzer BlueDart Courier slab seed')
assert.deepEqual(holzerBlueDart.slabs?.A.map((slab) => slab.rate), [80, 110, 150, 250, 350, 440])
assert.deepEqual(holzerBlueDart.slabs?.B.map((slab) => slab.rate), [100, 120, 160, 320, 420, 500])
assert.deepEqual(holzerBlueDart.slabs?.C.map((slab) => slab.rate), [140, 170, 210, 350, 480, 530])
assert.deepEqual(holzerBlueDart.slabs?.D.map((slab) => slab.rate), [160, 180, 220, 440, 520, 580])
assert.deepEqual(holzerBlueDart.slabs?.E.map((slab) => slab.rate), [200, 220, 310, 460, 640, 700])

console.log(`PDF rate-card seeds verified: ${expectedB2CSeeds.length} B2C couriers and ${b2bZoneCodes.length}x${b2bZoneCodes.length} B2B matrix.`)
