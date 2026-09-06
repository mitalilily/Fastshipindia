import { randomUUID } from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { Pool, PoolClient } from 'pg'
import { resolveDatabaseUrl } from '../config/databaseUrl'

type B2CZoneCode =
  | 'WITHIN_CITY'
  | 'WITHIN_STATE'
  | 'WITHIN_REGION'
  | 'METRO_TO_METRO'
  | 'ROI'
  | 'SPECIAL_ZONE'
  | 'KASHMIR'

type B2CRateType = 'forward' | 'reverse_pickup'

type B2CRateSeed = {
  id: number
  name: string
  serviceProvider: string
  mode: string
  type: B2CRateType
  baseWeightKg: number
  additionalWeightKg: number
  codCharges: number
  codPercent: number
  zones: Record<'A' | 'B' | 'C' | 'D' | 'E', number>
  additional: Record<'A' | 'B' | 'C' | 'D' | 'E', number>
  slabs?: Record<'A' | 'B' | 'C' | 'D' | 'E', RateCardSlabSeed[]>
}

type RateCardSlabSeed = {
  weightFromKg: number
  weightToKg: number | null
  rate: number
  extraRate?: number | null
  extraWeightUnitKg?: number | null
}

type B2BCourierSeed = {
  id: number
  name: string
  serviceProvider: string
}

const BASIC_PLAN_NAME = 'Basic'
const DELHIVERY_B2B_COURIER_ID = 101
const HOLZER_B2B_VOLUME_FACTOR = 3857.14

const delhiveryB2BCourierSeed: B2BCourierSeed = {
  id: DELHIVERY_B2B_COURIER_ID,
  name: 'Delhivery B2B LTL',
  serviceProvider: 'delhivery',
}

const holzerB2BCourierSeeds: B2BCourierSeed[] = [
  {
    id: 3101,
    name: 'Holzer Delhivery Parcel',
    serviceProvider: 'delhivery',
  },
  {
    id: 3102,
    name: 'Holzer Movin Parcel',
    serviceProvider: 'movin',
  },
  {
    id: 3103,
    name: 'Holzer XP India Parcel',
    serviceProvider: 'xpindia',
  },
]

const b2cZoneSeeds: Record<B2CZoneCode, { name: string; description: string; region: string }> = {
  WITHIN_CITY: {
    name: 'Within City',
    description: 'PDF Zone A - Within City',
    region: 'Within City',
  },
  WITHIN_STATE: {
    name: 'Within State',
    description: 'PDF Zone B - Within State',
    region: 'Within State',
  },
  WITHIN_REGION: {
    name: 'Within Region',
    description: 'Mapped to PDF Zone B - Within State',
    region: 'Within Region',
  },
  METRO_TO_METRO: {
    name: 'Metro to Metro',
    description: 'PDF Zone C - Metro To Metro',
    region: 'Metro to Metro',
  },
  ROI: {
    name: 'Rest of India',
    description: 'PDF Zone D - Rest Of India',
    region: 'Rest of India',
  },
  SPECIAL_ZONE: {
    name: 'North East, J&K',
    description: 'PDF Zone E - North East, Jammu and Kashmir',
    region: 'North East, J&K',
  },
  KASHMIR: {
    name: 'Kashmir',
    description: 'Mapped to PDF Zone E - North East, Jammu and Kashmir',
    region: 'North East, J&K',
  },
}

const pdfZoneMap: Record<'A' | 'B' | 'C' | 'D' | 'E', B2CZoneCode[]> = {
  A: ['WITHIN_CITY'],
  B: ['WITHIN_STATE', 'WITHIN_REGION'],
  C: ['METRO_TO_METRO'],
  D: ['ROI'],
  E: ['SPECIAL_ZONE', 'KASHMIR'],
}

const b2cRateSeeds: B2CRateSeed[] = [
  {
    id: 2001,
    name: 'Delhivery Air',
    serviceProvider: 'delhivery',
    mode: 'air',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 33,
    codPercent: 1.7,
    zones: { A: 34, B: 52, C: 55, D: 58, E: 72 },
    additional: { A: 31, B: 35, C: 49, D: 49, E: 64 },
  },
  {
    id: 2002,
    name: 'Delhivery Surface 0.5Kg',
    serviceProvider: 'delhivery',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 33,
    codPercent: 1.7,
    zones: { A: 27, B: 36, C: 41, D: 44, E: 57 },
    additional: { A: 22, B: 29, C: 34, D: 36, E: 50 },
  },
  {
    id: 2003,
    name: 'Delhivery Heavy MPS 10Kg',
    serviceProvider: 'delhivery',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 10,
    additionalWeightKg: 1,
    codCharges: 38,
    codPercent: 1.8,
    zones: { A: 190, B: 235, C: 278, D: 267, E: 396 },
    additional: { A: 18, B: 22, C: 26, D: 29, E: 39 },
  },
  {
    id: 2004,
    name: 'Delhivery Surface 5Kg',
    serviceProvider: 'delhivery',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 5,
    additionalWeightKg: 1,
    codCharges: 38,
    codPercent: 1.8,
    zones: { A: 136, B: 146, C: 158, D: 179, E: 210 },
    additional: { A: 26, B: 28, C: 30, D: 35, E: 41 },
  },
  {
    id: 2005,
    name: 'Delhivery Heavy MPS 20Kg',
    serviceProvider: 'delhivery',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 20,
    additionalWeightKg: 1,
    codCharges: 38,
    codPercent: 1.8,
    zones: { A: 350, B: 420, C: 490, D: 520, E: 720 },
    additional: { A: 16, B: 20, C: 23, D: 27, E: 32 },
  },
  {
    id: 2006,
    name: 'Delhivery 2Kg',
    serviceProvider: 'delhivery',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 2,
    additionalWeightKg: 1,
    codCharges: 30,
    codPercent: 1.5,
    zones: { A: 78, B: 87, C: 95, D: 99, E: 126 },
    additional: { A: 30, B: 32, C: 34, D: 35, E: 51 },
  },
  {
    id: 2007,
    name: 'Delhivery 1Kg',
    serviceProvider: 'delhivery',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 1,
    additionalWeightKg: 0.5,
    codCharges: 32,
    codPercent: 1.7,
    zones: { A: 60, B: 65, C: 70, D: 74, E: 95 },
    additional: { A: 25, B: 30, C: 35, D: 36, E: 48 },
  },
  {
    id: 2101,
    name: 'BlueDart Air 0.5Kg',
    serviceProvider: 'bluedart',
    mode: 'air',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 28,
    codPercent: 1.6,
    zones: { A: 40, B: 48, C: 52, D: 55, E: 74 },
    additional: { A: 38, B: 44.5, C: 44.5, D: 49, E: 71 },
  },
  {
    id: 2102,
    name: 'BlueDart Air 1Kg+',
    serviceProvider: 'bluedart',
    mode: 'air',
    type: 'forward',
    baseWeightKg: 1,
    additionalWeightKg: 0.5,
    codCharges: 31,
    codPercent: 1.6,
    zones: { A: 75, B: 91, C: 95, D: 99, E: 140 },
    additional: { A: 36, B: 42, C: 42, D: 46, E: 66 },
  },
  {
    id: 2103,
    name: 'BlueDart Surface 0.5Kg',
    serviceProvider: 'bluedart',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 27,
    codPercent: 1.5,
    zones: { A: 43, B: 45, C: 49, D: 51, E: 67 },
    additional: { A: 42, B: 44, C: 48, D: 49, E: 65 },
  },
  {
    id: 2104,
    name: 'BlueDart 2Kg',
    serviceProvider: 'bluedart',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 2,
    additionalWeightKg: 1,
    codCharges: 27,
    codPercent: 1.6,
    zones: { A: 63, B: 71, C: 81, D: 88, E: 120 },
    additional: { A: 28, B: 32, C: 35, D: 37, E: 45 },
  },
  {
    id: 2105,
    name: 'BlueDart Air Prime 0.5Kg',
    serviceProvider: 'bluedart',
    mode: 'air',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 27,
    codPercent: 1.5,
    zones: { A: 35, B: 43, C: 47, D: 50, E: 68 },
    additional: { A: 35, B: 41, C: 44, D: 46, E: 65 },
  },
  {
    id: 2106,
    name: 'BlueDart 1Kg+',
    serviceProvider: 'bluedart',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 1,
    additionalWeightKg: 0.5,
    codCharges: 27,
    codPercent: 1.5,
    zones: { A: 85, B: 88, C: 95, D: 99, E: 132 },
    additional: { A: 42, B: 44, C: 48, D: 48, E: 65 },
  },
  {
    id: 2107,
    name: 'BlueDart Surface Prime 0.5Kg',
    serviceProvider: 'bluedart',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 27,
    codPercent: 1.5,
    zones: { A: 38, B: 40, C: 43, D: 46, E: 60 },
    additional: { A: 38, B: 40, C: 43, D: 45, E: 60 },
  },
  {
    id: 2201,
    name: 'XpressBees 0.5Kg',
    serviceProvider: 'xpressbees',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 27,
    codPercent: 1.7,
    zones: { A: 28, B: 32, C: 35, D: 41, E: 56 },
    additional: { A: 16, B: 19, C: 23, D: 28, E: 38 },
  },
  {
    id: 2202,
    name: 'XpressBees 5Kg',
    serviceProvider: 'xpressbees',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 5,
    additionalWeightKg: 1,
    codCharges: 30,
    codPercent: 1.8,
    zones: { A: 115, B: 115, C: 150, D: 150, E: 189 },
    additional: { A: 20, B: 20, C: 30, D: 30, E: 40 },
  },
  {
    id: 2203,
    name: 'XpressBees 10Kg',
    serviceProvider: 'xpressbees',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 10,
    additionalWeightKg: 1,
    codCharges: 30,
    codPercent: 1.5,
    zones: { A: 159, B: 198, C: 266, D: 275, E: 360 },
    additional: { A: 16, B: 20, C: 26, D: 29, E: 36 },
  },
  {
    id: 2204,
    name: 'XpressBees 1Kg',
    serviceProvider: 'xpressbees',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 1,
    additionalWeightKg: 0.5,
    codCharges: 26,
    codPercent: 1.5,
    zones: { A: 34, B: 42, C: 49, D: 58, E: 75 },
    additional: { A: 17, B: 21, C: 25, D: 29, E: 35 },
  },
  {
    id: 2205,
    name: 'XpressBees 2Kg',
    serviceProvider: 'xpressbees',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 2,
    additionalWeightKg: 1,
    codCharges: 30,
    codPercent: 1.6,
    zones: { A: 50, B: 60, C: 72, D: 78, E: 99 },
    additional: { A: 25, B: 30, C: 36, D: 39, E: 50 },
  },
  {
    id: 2301,
    name: 'Amazon ATS 0.5Kg',
    serviceProvider: 'amazon',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 25,
    codPercent: 1.5,
    zones: { A: 28, B: 32, C: 35, D: 38, E: 48 },
    additional: { A: 17, B: 25, C: 25, D: 21.3, E: 34 },
  },
  {
    id: 2302,
    name: 'Amazon ATS 2Kg',
    serviceProvider: 'amazon',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 2,
    additionalWeightKg: 1,
    codCharges: 25,
    codPercent: 1.5,
    zones: { A: 44, B: 53, C: 63, D: 68, E: 94 },
    additional: { A: 18, B: 20, C: 21, D: 25, E: 31 },
  },
  {
    id: 2303,
    name: 'Amazon ATS 10Kg',
    serviceProvider: 'amazon',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 10,
    additionalWeightKg: 1,
    codCharges: 25,
    codPercent: 1.5,
    zones: { A: 178, B: 200, C: 220, D: 249, E: 338 },
    additional: { A: 12, B: 13, C: 14, D: 16, E: 21 },
  },
  {
    id: 2401,
    name: 'DTDC Surface 0.5Kg',
    serviceProvider: 'dtdc',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 28,
    codPercent: 1.6,
    zones: { A: 26, B: 34, C: 40, D: 46, E: 55 },
    additional: { A: 23, B: 31, C: 36, D: 41, E: 48 },
  },
  {
    id: 2501,
    name: 'TCI Express 5Kg+',
    serviceProvider: 'tci',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 5,
    additionalWeightKg: 1,
    codCharges: 30,
    codPercent: 1.5,
    zones: { A: 126, B: 152, C: 173, D: 180, E: 216 },
    additional: { A: 24, B: 29, C: 32, D: 33, E: 45 },
  },
  {
    id: 2601,
    name: 'Shadowfax 0.5Kg',
    serviceProvider: 'shadowfax',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 26,
    codPercent: 1.65,
    zones: { A: 24, B: 31, C: 33, D: 39, E: 48 },
    additional: { A: 20, B: 24, C: 27, D: 29, E: 38 },
  },
  {
    id: 2602,
    name: 'Shadowfax 2Kg',
    serviceProvider: 'shadowfax',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 2,
    additionalWeightKg: 1,
    codCharges: 26,
    codPercent: 1.5,
    zones: { A: 50, B: 50, C: 50, D: 50, E: 98 },
    additional: { A: 21, B: 24, C: 27, D: 33, E: 36 },
  },
  {
    id: 2701,
    name: 'Ekart 0.5Kg',
    serviceProvider: 'ekart',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 27.5,
    codPercent: 1.5,
    zones: { A: 29, B: 33, C: 36, D: 37, E: 52 },
    additional: { A: 19, B: 25, C: 25, D: 28, E: 37 },
  },
  {
    id: 2702,
    name: 'Ekart 1Kg',
    serviceProvider: 'ekart',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 1,
    additionalWeightKg: 0.5,
    codCharges: 25.5,
    codPercent: 1.8,
    zones: { A: 43, B: 49, C: 55, D: 60, E: 79 },
    additional: { A: 15, B: 15, C: 19, D: 21, E: 27 },
  },
  {
    id: 2703,
    name: 'Ekart 5Kg',
    serviceProvider: 'ekart',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 5,
    additionalWeightKg: 1,
    codCharges: 30,
    codPercent: 1.5,
    zones: { A: 100, B: 130, C: 140, D: 140, E: 210 },
    additional: { A: 18, B: 24, C: 24, D: 28, E: 40 },
  },
  {
    id: 2704,
    name: 'Ekart Air',
    serviceProvider: 'ekart',
    mode: 'air',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 32,
    codPercent: 1.6,
    zones: { A: 28, B: 34, C: 55, D: 60, E: 68 },
    additional: { A: 12, B: 16, C: 35, D: 38, E: 50 },
  },
  {
    id: 2705,
    name: 'Ekart Flat Price',
    serviceProvider: 'ekart',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 0,
    codPercent: 1,
    zones: { A: 62, B: 62, C: 62, D: 62, E: 62 },
    additional: { A: 10, B: 10, C: 10, D: 10, E: 10 },
  },
  {
    id: 2801,
    name: 'Movin Air 5Kg',
    serviceProvider: 'movin',
    mode: 'air',
    type: 'forward',
    baseWeightKg: 5,
    additionalWeightKg: 1,
    codCharges: 0,
    codPercent: 0,
    zones: { A: 325, B: 360, C: 360, D: 444, E: 630 },
    additional: { A: 65, B: 72, C: 72, D: 89, E: 126 },
  },
  {
    id: 2901,
    name: 'IndiaPost SpeedPost',
    serviceProvider: 'indiapost',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 28,
    codPercent: 2,
    zones: { A: 30, B: 60, C: 70, D: 80, E: 90 },
    additional: { A: 10, B: 30, C: 30, D: 40, E: 50 },
  },
  {
    id: 2902,
    name: 'IndiaPost Business Parcel',
    serviceProvider: 'indiapost',
    mode: 'surface',
    type: 'forward',
    baseWeightKg: 2,
    additionalWeightKg: 1,
    codCharges: 70,
    codPercent: 2.1,
    zones: { A: 45, B: 88, C: 105, D: 115, E: 115 },
    additional: { A: 12, B: 24, C: 28, D: 34, E: 38 },
  },
  {
    id: 3104,
    name: 'Holzer BlueDart Courier',
    serviceProvider: 'bluedart',
    mode: 'air',
    type: 'forward',
    baseWeightKg: 0.5,
    additionalWeightKg: 0,
    codCharges: 0,
    codPercent: 0,
    zones: { A: 80, B: 100, C: 140, D: 160, E: 200 },
    additional: { A: 0, B: 0, C: 0, D: 0, E: 0 },
    slabs: {
      A: [
        { weightFromKg: 0, weightToKg: 0.5, rate: 80 },
        { weightFromKg: 0.5, weightToKg: 1, rate: 110 },
        { weightFromKg: 1, weightToKg: 2, rate: 150 },
        { weightFromKg: 2, weightToKg: 5, rate: 250 },
        { weightFromKg: 5, weightToKg: 10, rate: 350 },
        { weightFromKg: 10, weightToKg: 15, rate: 440 },
      ],
      B: [
        { weightFromKg: 0, weightToKg: 0.5, rate: 100 },
        { weightFromKg: 0.5, weightToKg: 1, rate: 120 },
        { weightFromKg: 1, weightToKg: 2, rate: 160 },
        { weightFromKg: 2, weightToKg: 5, rate: 320 },
        { weightFromKg: 5, weightToKg: 10, rate: 420 },
        { weightFromKg: 10, weightToKg: 15, rate: 500 },
      ],
      C: [
        { weightFromKg: 0, weightToKg: 0.5, rate: 140 },
        { weightFromKg: 0.5, weightToKg: 1, rate: 170 },
        { weightFromKg: 1, weightToKg: 2, rate: 210 },
        { weightFromKg: 2, weightToKg: 5, rate: 350 },
        { weightFromKg: 5, weightToKg: 10, rate: 480 },
        { weightFromKg: 10, weightToKg: 15, rate: 530 },
      ],
      D: [
        { weightFromKg: 0, weightToKg: 0.5, rate: 160 },
        { weightFromKg: 0.5, weightToKg: 1, rate: 180 },
        { weightFromKg: 1, weightToKg: 2, rate: 220 },
        { weightFromKg: 2, weightToKg: 5, rate: 440 },
        { weightFromKg: 5, weightToKg: 10, rate: 520 },
        { weightFromKg: 10, weightToKg: 15, rate: 580 },
      ],
      E: [
        { weightFromKg: 0, weightToKg: 0.5, rate: 200 },
        { weightFromKg: 0.5, weightToKg: 1, rate: 220 },
        { weightFromKg: 1, weightToKg: 2, rate: 310 },
        { weightFromKg: 2, weightToKg: 5, rate: 460 },
        { weightFromKg: 5, weightToKg: 10, rate: 640 },
        { weightFromKg: 10, weightToKg: 15, rate: 700 },
      ],
    },
  },
  {
    id: 2008,
    name: 'Delhivery Heavy MPS Reverse',
    serviceProvider: 'delhivery',
    mode: 'surface',
    type: 'reverse_pickup',
    baseWeightKg: 10,
    additionalWeightKg: 1,
    codCharges: 0,
    codPercent: 0,
    zones: { A: 260, B: 306, C: 370, D: 390, E: 540 },
    additional: { A: 23, B: 28, C: 32, D: 36, E: 50 },
  },
  {
    id: 2706,
    name: 'Ekart 0.5Kg Reverse',
    serviceProvider: 'ekart',
    mode: 'surface',
    type: 'reverse_pickup',
    baseWeightKg: 0.5,
    additionalWeightKg: 0.5,
    codCharges: 0,
    codPercent: 0,
    zones: { A: 70, B: 75, C: 80, D: 90, E: 99 },
    additional: { A: 25, B: 30, C: 35, D: 40, E: 50 },
  },
]

const b2cSeedProviderKeys = Array.from(
  new Set(b2cRateSeeds.map((seed) => seed.serviceProvider.toLowerCase())),
)
const b2cSeedCourierIds = b2cRateSeeds.map((seed) => seed.id)

const b2bZoneCodes = [
  'N1',
  'N2',
  'N3',
  'N4',
  'C1',
  'C2',
  'W1',
  'W2',
  'S1',
  'S2',
  'S3',
  'S4',
  'E1',
  'E2',
  'NE1',
  'NE2',
] as const

const b2bMatrix: Record<(typeof b2bZoneCodes)[number], number[]> = {
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

const holzerB2BZoneCodes = [
  'N1',
  'N2',
  'N3',
  'C1',
  'C2',
  'W1',
  'W2',
  'E1',
  'E2',
  'S1',
  'S2',
  'S3',
  'NE1',
  'NE2',
] as const

const holzerB2BMatrix: Record<(typeof holzerB2BZoneCodes)[number], number[]> = {
  N1: [9, 15, 18, 17, 18, 20, 21, 21, 22, 21, 22, 23, 29, 34],
  N2: [],
  N3: [],
  C1: [],
  C2: [],
  W1: [],
  W2: [],
  E1: [],
  E2: [],
  S1: [],
  S2: [],
  S3: [],
  NE1: [],
  NE2: [],
}

const loadEnv = () => {
  const env = process.env.NODE_ENV || 'development'
  dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) })
}

const tableExists = async (client: PoolClient, tableName: string) => {
  const { rows } = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = $1 limit 1`,
    [tableName],
  )
  return rows.length > 0
}

const resolveTable = async (client: PoolClient, names: string[]) => {
  for (const name of names) {
    if (await tableExists(client, name)) return name
  }
  throw new Error(`Missing required table. Tried: ${names.join(', ')}`)
}

const ensureBasicPlan = async (client: PoolClient) => {
  const existing = await client.query(
    `select id from plans where lower(name) = lower($1) order by created_at nulls last limit 1`,
    [BASIC_PLAN_NAME],
  )
  if (existing.rows[0]?.id) return String(existing.rows[0].id)

  const id = randomUUID()
  await client.query(
    `insert into plans (id, name, description, is_active, created_at)
     values ($1, $2, $3, true, now())`,
    [id, BASIC_PLAN_NAME, 'Default PDF rate card plan'],
  )
  return id
}

const ensureB2CZones = async (client: PoolClient, zonesTable: string) => {
  const zoneIds = new Map<B2CZoneCode, string>()
  for (const [code, zone] of Object.entries(b2cZoneSeeds) as [
    B2CZoneCode,
    (typeof b2cZoneSeeds)[B2CZoneCode],
  ][]) {
    const existing = await client.query(
      `select id from "${zonesTable}"
       where upper(business_type) = 'B2C' and upper(code) = $1 limit 1`,
      [code],
    )

    if (existing.rows[0]?.id) {
      const id = String(existing.rows[0].id)
      await client.query(
        `update "${zonesTable}"
         set name = $1,
             description = $2,
             region = $3,
             updated_at = now()
         where id = $4`,
        [zone.name, zone.description, zone.region, id],
      )
      zoneIds.set(code, id)
      continue
    }

    const id = randomUUID()
    await client.query(
      `insert into "${zonesTable}"
        (id, code, name, description, region, business_type, metadata, states, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'B2C', $6::jsonb, '[]'::jsonb, now(), now())`,
      [id, code, zone.name, zone.description, zone.region, JSON.stringify({ source: 'pdf_rate_card' })],
    )
    zoneIds.set(code, id)
  }
  return zoneIds
}

const ensureB2BCourier = async (client: PoolClient, courier: B2BCourierSeed) => {
  await client.query(
    `insert into couriers
      (id, name, "serviceProvider", "isEnabled", business_type, created_at, updated_at)
     values ($1, $2, $3, true, '["b2b"]'::jsonb, now(), now())
     on conflict (id, "serviceProvider") do update set
       name = excluded.name,
       "isEnabled" = true,
       business_type = case
         when couriers.business_type @> '["b2b"]'::jsonb then couriers.business_type
         else coalesce(couriers.business_type, '[]'::jsonb) || '["b2b"]'::jsonb
       end,
       updated_at = now()`,
    [courier.id, courier.name, courier.serviceProvider],
  )
}

const ensureB2CCourier = async (client: PoolClient, seed: B2CRateSeed) => {
  await client.query(
    `insert into couriers
      (id, name, "serviceProvider", "isEnabled", business_type, created_at, updated_at)
     values ($1, $2, $3, true, '["b2c"]'::jsonb, now(), now())
     on conflict (id, "serviceProvider") do update set
       name = excluded.name,
       "isEnabled" = true,
       business_type = case
         when couriers.business_type @> '["b2c"]'::jsonb then couriers.business_type
         else coalesce(couriers.business_type, '[]'::jsonb) || '["b2c"]'::jsonb
       end,
       updated_at = now()`,
    [seed.id, seed.name, seed.serviceProvider],
  )
}

const upsertB2CRate = async (
  client: PoolClient,
  planId: string,
  seed: B2CRateSeed,
  zoneId: string,
  baseRate: number,
  additionalRate: number,
  slabs?: RateCardSlabSeed[],
) => {
  const existing = await client.query(
    `select id from shipping_rates
     where plan_id = $1
       and courier_id = $2
       and business_type = 'b2c'
       and zone_id = $3
       and type = $4
       and lower(mode) = lower($5)
       and lower(coalesce(service_provider, '')) = lower($6)
     order by created_at nulls first, id limit 1`,
    [planId, seed.id, zoneId, seed.type, seed.mode, seed.serviceProvider],
  )

  const rateId = existing.rows[0]?.id ? String(existing.rows[0].id) : randomUUID()
  if (existing.rows[0]?.id) {
    await client.query(
      `update shipping_rates
       set courier_name = $1,
           service_provider = $2,
           cod_charges = $3,
           cod_percent = $4,
           other_charges = 0,
           rate = $5,
           mode = $6,
           min_weight = $7,
           last_updated = now()
       where id = $8`,
      [
        seed.name,
        seed.serviceProvider,
        seed.codCharges,
        seed.codPercent,
        baseRate,
        seed.mode,
        seed.baseWeightKg,
        rateId,
      ],
    )
  } else {
    await client.query(
      `insert into shipping_rates
        (id, plan_id, service_provider, cod_charges, cod_percent, other_charges, rate,
         last_updated, courier_id, courier_name, mode, business_type, min_weight, zone_id, type, created_at)
       values ($1, $2, $3, $4, $5, 0, $6, now(), $7, $8, $9, 'b2c', $10, $11, $12, now())`,
      [
        rateId,
        planId,
        seed.serviceProvider,
        seed.codCharges,
        seed.codPercent,
        baseRate,
        seed.id,
        seed.name,
        seed.mode,
        seed.baseWeightKg,
        zoneId,
        seed.type,
      ],
    )
  }

  await client.query(`delete from shipping_rate_slabs where shipping_rate_id = $1`, [rateId])
  const rateSlabs =
    slabs && slabs.length
      ? slabs
      : [
          {
            weightFromKg: 0,
            weightToKg: seed.baseWeightKg,
            rate: baseRate,
            extraRate: additionalRate,
            extraWeightUnitKg: seed.additionalWeightKg,
          },
        ]

  for (const slab of rateSlabs) {
    await client.query(
      `insert into shipping_rate_slabs
        (id, shipping_rate_id, weight_from, weight_to, rate, extra_rate, extra_weight_unit, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [
        randomUUID(),
        rateId,
        slab.weightFromKg,
        slab.weightToKg,
        slab.rate,
        slab.extraRate ?? null,
        slab.extraWeightUnitKg ?? null,
      ],
    )
  }
}

const seedB2CRates = async (client: PoolClient, planId: string, zonesTable: string) => {
  const zoneIds = await ensureB2CZones(client, zonesTable)
  let saved = 0

  const staleRates = await client.query(
    `select id from shipping_rates
     where plan_id = $1
       and business_type = 'b2c'
       and (
         lower(coalesce(service_provider, '')) = any($2::text[])
         or courier_id = any($3::int[])
       )`,
    [planId, b2cSeedProviderKeys, b2cSeedCourierIds],
  )
  const staleRateIds = staleRates.rows.map((row) => row.id as string)
  if (staleRateIds.length) {
    await client.query(`delete from shipping_rate_slabs where shipping_rate_id = any($1::uuid[])`, [
      staleRateIds,
    ])
    await client.query(`delete from shipping_rates where id = any($1::uuid[])`, [staleRateIds])
  }

  for (const seed of b2cRateSeeds) {
    await ensureB2CCourier(client, seed)
    for (const [pdfZone, appZones] of Object.entries(pdfZoneMap) as [
      keyof B2CRateSeed['zones'],
      B2CZoneCode[],
    ][]) {
      for (const appZoneCode of appZones) {
        const zoneId = zoneIds.get(appZoneCode)
        if (!zoneId) continue
        await upsertB2CRate(
          client,
          planId,
          seed,
          zoneId,
          seed.zones[pdfZone],
          seed.additional[pdfZone],
          seed.slabs?.[pdfZone],
        )
        saved += 1
      }
    }
  }

  return saved
}

const ensureB2BZones = async (client: PoolClient, zonesTable: string) => {
  const zoneIds = new Map<string, string>()
  for (const code of b2bZoneCodes) {
    const existing = await client.query(
      `select id from "${zonesTable}"
       where upper(business_type) = 'B2B' and upper(code) = $1 limit 1`,
      [code],
    )

    if (existing.rows[0]?.id) {
      const id = String(existing.rows[0].id)
      await client.query(
        `update "${zonesTable}"
         set name = $1,
             description = $2,
             region = $3,
             updated_at = now()
         where id = $4`,
        [`Zone ${code}`, 'PDF Delhivery B2B LTL zone', code, id],
      )
      zoneIds.set(code, id)
      continue
    }

    const id = randomUUID()
    await client.query(
      `insert into "${zonesTable}"
        (id, code, name, description, region, business_type, metadata, states, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'B2B', $6::jsonb, '[]'::jsonb, now(), now())`,
      [
        id,
        code,
        `Zone ${code}`,
        'PDF Delhivery B2B LTL zone',
        code,
        JSON.stringify({ source: 'pdf_rate_card' }),
      ],
    )
    zoneIds.set(code, id)
  }
  return zoneIds
}

const upsertB2BMatrixRate = async (
  client: PoolClient,
  planId: string,
  originZoneId: string,
  destinationZoneId: string,
  ratePerKg: number,
  courier: B2BCourierSeed,
  source: string,
  volumetricFactor = 4500,
) => {
  const existing = await client.query(
    `select id from shiplifi_b2b_zone_to_zone_rates
     where plan_id = $1
       and origin_zone_id = $2
       and destination_zone_id = $3
       and courier_id = $4
       and lower(coalesce(service_provider, '')) = lower($5)
     order by created_at nulls first, id limit 1`,
    [planId, originZoneId, destinationZoneId, courier.id, courier.serviceProvider],
  )

  if (existing.rows[0]?.id) {
    await client.query(
      `update shiplifi_b2b_zone_to_zone_rates
       set rate_per_kg = $1,
           volumetric_factor = $2,
           is_active = true,
           metadata = $3::jsonb,
           updated_at = now()
       where id = $4`,
      [
        ratePerKg,
        volumetricFactor,
        JSON.stringify({ source, courier_name: courier.name }),
        existing.rows[0].id,
      ],
    )
    return
  }

  await client.query(
    `insert into shiplifi_b2b_zone_to_zone_rates
      (id, plan_id, origin_zone_id, destination_zone_id, courier_id, service_provider,
       rate_per_kg, volumetric_factor, effective_from, is_active, metadata, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now(), true, $9::jsonb, now(), now())`,
    [
      randomUUID(),
      planId,
      originZoneId,
      destinationZoneId,
      courier.id,
      courier.serviceProvider,
      ratePerKg,
      volumetricFactor,
      JSON.stringify({ source, courier_name: courier.name }),
    ],
  )
}

const upsertB2BAdditionalCharges = async (client: PoolClient, planId: string) => {
  const existing = await client.query(
    `select id from shiplifi_b2b_additional_charges
     where plan_id = $1 and courier_id = $2 and lower(coalesce(service_provider, '')) = 'delhivery'
     limit 1`,
    [planId, DELHIVERY_B2B_COURIER_ID],
  )

  const values = [
    planId,
    DELHIVERY_B2B_COURIER_ID,
    'delhivery',
    100,
    4500,
    360,
    15,
    40,
    500,
    3,
    60,
    0.8,
    100,
    0.3,
    JSON.stringify({
      source: 'b2b price list.pdf',
      insurance: '0.5% OR Rs 0 whichever is higher',
      to_pay: '0% OR Rs 100 whichever is higher',
      first_mile_cost: 'Rs 0.15 per kg OR Rs 35 whichever is higher',
      sdl: 'Rs 6 per kg OR Rs 0 whichever is higher',
      rov_owner: '0% OR Rs 70 whichever is higher',
      green_charge: 'Rs 0.25 per kg OR Rs 40 whichever is higher',
      gst: '18%',
    }),
  ]

  if (existing.rows[0]?.id) {
    await client.query(
      `update shiplifi_b2b_additional_charges
       set awb_charges = $4,
           cft_factor = $5,
           minimum_chargeable_amount = $6,
           minimum_chargeable_weight = 0,
           minimum_chargeable_method = 'whichever_is_higher',
           fuel_surcharge_percentage = $7,
           green_tax = $8,
           oda_charges = $9,
           oda_per_kg_charge = $10,
           oda_method = 'whichever_is_higher',
           cod_fixed_amount = $11,
           cod_percentage = $12,
           cod_method = 'whichever_is_higher',
           rov_fixed_amount = $13,
           rov_percentage = $14,
           rov_method = 'whichever_is_higher',
           metadata = $15::jsonb,
           updated_at = now()
       where id = $16`,
      [...values, existing.rows[0].id],
    )
    return
  }

  await client.query(
    `insert into shiplifi_b2b_additional_charges
      (id, plan_id, courier_id, service_provider, awb_charges, cft_factor,
       minimum_chargeable_amount, minimum_chargeable_weight, minimum_chargeable_method,
       fuel_surcharge_percentage, green_tax, oda_charges, oda_per_kg_charge,
       oda_method, cod_fixed_amount, cod_percentage, cod_method,
       rov_fixed_amount, rov_percentage, rov_method, metadata, created_at, updated_at)
     values ($16, $1, $2, $3, $4, $5, $6, 0, 'whichever_is_higher',
       $7, $8, $9, $10, 'whichever_is_higher', $11, $12, 'whichever_is_higher',
       $13, $14, 'whichever_is_higher', $15::jsonb, now(), now())`,
    [...values, randomUUID()],
  )
}

const upsertHolzerB2BAdditionalCharges = async (
  client: PoolClient,
  planId: string,
  courier: B2BCourierSeed,
) => {
  const existing = await client.query(
    `select id from shiplifi_b2b_additional_charges
     where plan_id = $1 and courier_id = $2 and lower(coalesce(service_provider, '')) = lower($3)
     limit 1`,
    [planId, courier.id, courier.serviceProvider],
  )

  const values = [
    planId,
    courier.id,
    courier.serviceProvider,
    100,
    7,
    500,
    20,
    19,
    500,
    3,
    100,
    0.1,
    5000,
    JSON.stringify({
      source: 'HOLZER INDIA PARPOSAL.pdf',
      client: 'HOLZER INDIA PVT LTD',
      courier_name: courier.name,
      minimum_chargeable: '20 kg and Rs 500 minimum chargeable amount',
      volumetric_formula: 'L*B*H/27000*7 in centimeters',
      gst: '18%',
      no_hidden_charge: true,
      handling_above_150_kg: '3 kg or Rs 500 whichever is higher',
      risk_cover: '1.5% invoice declared value when opted',
    }),
  ]

  if (existing.rows[0]?.id) {
    await client.query(
      `update shiplifi_b2b_additional_charges
       set awb_charges = $4,
           cft_factor = $5,
           minimum_chargeable_amount = $6,
           minimum_chargeable_weight = $7,
           minimum_chargeable_method = 'whichever_is_higher',
           fuel_surcharge_percentage = $8,
           green_tax = 0,
           oda_charges = $9,
           oda_per_kg_charge = $10,
           oda_method = 'whichever_is_higher',
           cod_fixed_amount = 0,
           cod_percentage = 0,
           cod_method = 'whichever_is_higher',
           rov_fixed_amount = $11,
           rov_percentage = $12,
           rov_method = 'whichever_is_higher',
           liability_limit = $13,
           liability_method = 'whichever_is_lower',
           public_holiday_pickup_charge = 500,
           custom_fields = jsonb_build_object(
             'risk_cover_percentage', 1.5,
             'handling_above_150_kg_amount', 500,
             'handling_above_150_kg_weight', 3
           ),
           metadata = $14::jsonb,
           updated_at = now()
       where id = $15`,
      [...values, existing.rows[0].id],
    )
    return
  }

  await client.query(
    `insert into shiplifi_b2b_additional_charges
      (id, plan_id, courier_id, service_provider, awb_charges, cft_factor,
       minimum_chargeable_amount, minimum_chargeable_weight, minimum_chargeable_method,
       fuel_surcharge_percentage, green_tax, oda_charges, oda_per_kg_charge,
       oda_method, cod_fixed_amount, cod_percentage, cod_method,
       rov_fixed_amount, rov_percentage, rov_method, liability_limit, liability_method,
       public_holiday_pickup_charge, custom_fields, metadata, created_at, updated_at)
     values ($15, $1, $2, $3, $4, $5, $6, $7, 'whichever_is_higher',
       $8, 0, $9, $10, 'whichever_is_higher', 0, 0, 'whichever_is_higher',
       $11, $12, 'whichever_is_higher', $13, 'whichever_is_lower',
       500, jsonb_build_object(
         'risk_cover_percentage', 1.5,
         'handling_above_150_kg_amount', 500,
         'handling_above_150_kg_weight', 3
       ), $14::jsonb, now(), now())`,
    [...values, randomUUID()],
  )
}

const seedB2BRates = async (client: PoolClient, planId: string, zonesTable: string) => {
  await ensureB2BCourier(client, delhiveryB2BCourierSeed)
  const zoneIds = await ensureB2BZones(client, zonesTable)
  let saved = 0

  for (const origin of b2bZoneCodes) {
    const originZoneId = zoneIds.get(origin)
    if (!originZoneId) continue
    for (let index = 0; index < b2bZoneCodes.length; index += 1) {
      const destination = b2bZoneCodes[index]
      const destinationZoneId = zoneIds.get(destination)
      if (!destinationZoneId) continue
      await upsertB2BMatrixRate(
        client,
        planId,
        originZoneId,
        destinationZoneId,
        b2bMatrix[origin][index],
        delhiveryB2BCourierSeed,
        'b2b price list.pdf',
      )
      saved += 1
    }
  }

  await upsertB2BAdditionalCharges(client, planId)

  for (const courier of holzerB2BCourierSeeds) {
    await ensureB2BCourier(client, courier)
    for (const origin of holzerB2BZoneCodes) {
      const originZoneId = zoneIds.get(origin)
      const originRates = holzerB2BMatrix[origin]
      if (!originZoneId || !originRates.length) continue
      for (let index = 0; index < holzerB2BZoneCodes.length; index += 1) {
        const destination = holzerB2BZoneCodes[index]
        const destinationZoneId = zoneIds.get(destination)
        const ratePerKg = originRates[index]
        if (!destinationZoneId || ratePerKg === undefined) continue
        await upsertB2BMatrixRate(
          client,
          planId,
          originZoneId,
          destinationZoneId,
          ratePerKg,
          courier,
          'HOLZER INDIA PARPOSAL.pdf',
          HOLZER_B2B_VOLUME_FACTOR,
        )
        saved += 1
      }
    }
    await upsertHolzerB2BAdditionalCharges(client, planId, courier)
  }
  return saved
}

export const seedPdfRateCards = async () => {
  loadEnv()
  const env = process.env.NODE_ENV || 'development'
  const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: env === 'production' ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()
  try {
    await client.query('begin')
    const zonesTable = await resolveTable(client, [
      'shiplifi_zones',
      'meracourierwala_zones',
      'zones',
    ])
    await resolveTable(client, ['shiplifi_b2b_zone_to_zone_rates'])
    await resolveTable(client, ['shiplifi_b2b_additional_charges'])

    const planId = await ensureBasicPlan(client)
    const b2cRows = await seedB2CRates(client, planId, zonesTable)
    const b2bRows = await seedB2BRates(client, planId, zonesTable)
    await client.query('commit')

    console.log(
      `PDF rate cards seeded: ${b2cRows} B2C zone rows and ${b2bRows} B2B matrix rows for plan ${planId}.`,
    )
  } catch (error) {
    await client.query('rollback').catch(() => undefined)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

if (require.main === module) {
  seedPdfRateCards().catch((error) => {
    console.error('Failed to seed PDF rate cards:', error)
    process.exit(1)
  })
}
