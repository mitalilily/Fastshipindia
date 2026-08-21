import axiosInstance from './axiosInstance'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchLocations = async (params: any) => {
  const res = await axiosInstance.get(`/serviceability/locations`, { params })
  return res.data
}

export interface PincodeLocation {
  city: string
  state: string
}

interface IndiaPostOffice {
  Name?: string
  District?: string
  State?: string
  Block?: string
  BranchType?: string
  DeliveryStatus?: string
}

interface IndiaPostPincodeResponse {
  Status?: string
  PostOffice?: IndiaPostOffice[] | null
}

const normalizeLocation = (location: unknown): PincodeLocation | null => {
  if (!location || typeof location !== 'object') return null
  const record = location as Record<string, unknown>
  const city = String(record.city ?? record.City ?? '').trim()
  const state = String(record.state ?? record.State ?? '').trim()

  if (!city || !state) return null
  return { city, state }
}

const lookupIndiaPostPincode = async (pincode: string): Promise<PincodeLocation | null> => {
  const response = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`)
  if (!response.ok) return null

  const data = (await response.json()) as IndiaPostPincodeResponse[]
  const result = Array.isArray(data) ? data[0] : null
  if (result?.Status !== 'Success' || !Array.isArray(result.PostOffice)) return null

  const postOffice =
    result.PostOffice.find((office) => office.DeliveryStatus === 'Delivery' && office.Block) ??
    result.PostOffice.find((office) => office.Block) ??
    result.PostOffice[0]

  const city = String(postOffice?.Block || postOffice?.District || postOffice?.Name || '').trim()
  const state = String(postOffice?.State || '').trim()

  if (!city || !state) return null
  return { city, state }
}

export const lookupPincodeLocation = async (pincode: string): Promise<PincodeLocation | null> => {
  try {
    const data = await fetchLocations({ pincode, limit: 1 })
    const location = Array.isArray(data?.data) ? data.data[0] : data?.data
    const normalizedLocation = normalizeLocation(location)
    if (normalizedLocation) return normalizedLocation
  } catch {
    // Fall back to India Post below when internal serviceability data is missing or unavailable.
  }

  return lookupIndiaPostPincode(pincode)
}
