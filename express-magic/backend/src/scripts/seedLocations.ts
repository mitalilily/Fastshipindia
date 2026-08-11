// src/scripts/seedLocations.ts
import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'
import { inArray } from 'drizzle-orm'
import { db } from '../models/client'
import { locations } from '../schema/schema'

const DATA_DIR = path.resolve('src/scripts/data')
const CHUNK_SIZE = 500
const DEFAULT_FILE = 'locations.xlsx'

type Row = {
  pincode: string
  city: string
  state: string
  country: string
  tags: string[]
}

function normalize(x: any): string {
  return (x ?? '').toString().trim()
}

const SPECIAL_ZONE_STATES = new Set(
  [
    'Arunachal Pradesh',
    'Assam',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Tripura',
    'Jammu and Kashmir',
  ].map((s) => s.toLowerCase()),
)

function mapRow(raw: Record<string, any>): Row | null {
  const pincode = normalize(raw['Pincode'])
  if (!pincode || !/^\d{6}$/.test(pincode)) return null

  const state = normalize(raw['HubState'])
  const city = normalize(raw['BillingCity'])
  const billingZone = normalize(raw['BillingZone'])
  const cityType = normalize(raw['City Type'])

  const tags: string[] = []
  if (billingZone) tags.push(billingZone.toLowerCase())
  if (cityType) tags.push(cityType.toLowerCase())
  if (state && SPECIAL_ZONE_STATES.has(state.toLowerCase())) {
    tags.push('special_zone')
  }

  return { pincode, city, state, country: 'India', tags }
}

async function insertBatch(rows: Row[]) {
  if (!rows.length) return

  const pincodes = Array.from(new Set(rows.map((row) => row.pincode)))
  const existingRows = await db
    .select({ pincode: locations.pincode })
    .from(locations)
    .where(inArray(locations.pincode, pincodes))
  const existingPincodes = new Set(existingRows.map((row) => row.pincode))
  const newRows = rows.filter((row) => !existingPincodes.has(row.pincode))

  if (!newRows.length) {
    console.log(
      `skipping batch: ${rows[0].pincode}-${rows[rows.length - 1].pincode} already exists`,
    )
    return
  }

  const values = newRows.map((r) => ({
    pincode: r.pincode,
    city: r.city,
    state: r.state,
    country: r.country,
    tags: Array.isArray(r.tags) ? r.tags : [],
    created_at: new Date(),
  }))

  console.log(
    `inserting batch: ${values[0].pincode}-${values[values.length - 1].pincode}`,
  )
  await db.insert(locations).values(values)

  console.log(`Inserted ${newRows.length} rows, skipped ${rows.length - newRows.length}`)
}

async function importXlsx(filename: string) {
  const fullPath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`)
  }

  console.log('Reading XLSX:', fullPath)
  const wb = XLSX.readFile(fullPath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  console.log('Total rows parsed:', jsonRows.length)

  let batch: Row[] = []
  let processed = 0

  for (const raw of jsonRows) {
    const mapped = mapRow(raw)
    if (!mapped) continue

    batch.push(mapped)

    if (batch.length >= CHUNK_SIZE) {
      await insertBatch(batch)
      processed += batch.length
      if (processed % 1000 === 0) console.log(`Processed ${processed} rows...`)
      batch = []
    }
  }

  if (batch.length) {
    await insertBatch(batch)
    processed += batch.length
  }

  console.log(`Import finished. Total processed: ${processed}`)
}

;(async () => {
  const arg = process.argv[2] || DEFAULT_FILE

  try {
    await importXlsx(arg)
  } catch (err) {
    console.error('Import failed:', (err as Error).message)
    process.exitCode = 1
  }
})()
