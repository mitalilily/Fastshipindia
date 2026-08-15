import Papa from 'papaparse'

type ZoneRateCsvRecord = Record<string, string | undefined>

export type ParsedZoneRateCsvRow = {
  originZone: string
  destinationZone: string
  ratePerKg: string
  rowNumber: number
}

const normalizeCsvHeader = (header: string) =>
  String(header ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const firstCsvValue = (row: ZoneRateCsvRecord, aliases: string[]) => {
  for (const alias of aliases) {
    const value = row[alias]
    if (value != null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

export const parseZoneRateCsvRows = (fileBuffer: Buffer): ParsedZoneRateCsvRow[] => {
  const parsed = Papa.parse<ZoneRateCsvRecord>(fileBuffer.toString('utf8'), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeCsvHeader,
  })

  if (parsed.errors?.length) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`)
  }

  const fields = new Set((parsed.meta.fields ?? []).map(normalizeCsvHeader))
  const originAliases = ['origin_zone_code', 'origin_zone', 'origin']
  const destinationAliases = ['destination_zone_code', 'destination_zone', 'destination']
  const rateAliases = ['rate_per_kg', 'rate_kg', 'rate']
  const hasAlias = (aliases: string[]) => aliases.some((alias) => fields.has(alias))

  if (!hasAlias(originAliases) || !hasAlias(destinationAliases) || !hasAlias(rateAliases)) {
    throw new Error(
      'CSV must include Origin Zone, Destination Zone, and Rate Per Kg columns. Download the latest template and try again.',
    )
  }

  const rows = parsed.data
    .map((row, index) => ({
      originZone: firstCsvValue(row, originAliases),
      destinationZone: firstCsvValue(row, destinationAliases),
      ratePerKg: firstCsvValue(row, rateAliases),
      rowNumber: index + 2,
    }))
    .filter((row) => row.originZone || row.destinationZone || row.ratePerKg)

  if (!rows.length) {
    throw new Error('CSV contains no rate rows')
  }

  return rows
}

export const parseCsvRate = (value: string) => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/^[^0-9+.-]+/, '')
    .replace(/,/g, '')
    .replace(/\s*\/\s*kg$/i, '')
    .trim()
  const rate = Number(normalized)
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Rate Per Kg must be a number greater than zero')
  }
  return rate
}
