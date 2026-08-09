import { eq } from 'drizzle-orm'
import { db } from '../client'
import { courier_credentials } from '../schema/courierCredentials'

export const DELHIVERY_B2B_PROVIDER = 'delhivery_b2b'
export const DEFAULT_DELHIVERY_B2B_API_BASE = 'https://ltl-clients-api.delhivery.com'

export interface DelhiveryB2BCredentials {
  apiBase: string
  username: string
  password: string
  clientId: string
  warehouseId: string
  freightMode: 'fop' | 'fod'
  fmPickup: boolean
}

const clean = (value: unknown) => String(value ?? '').trim()

const asBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value
  const normalized = clean(value).toLowerCase()
  if (['true', '1', 'yes'].includes(normalized)) return true
  if (['false', '0', 'no'].includes(normalized)) return false
  return fallback
}

export const getDelhiveryB2BCredentials = async (): Promise<DelhiveryB2BCredentials> => {
  const [stored] = await db
    .select({
      apiBase: courier_credentials.apiBase,
      username: courier_credentials.username,
      password: courier_credentials.password,
      clientId: courier_credentials.clientId,
      metadata: courier_credentials.metadata,
    })
    .from(courier_credentials)
    .where(eq(courier_credentials.provider, DELHIVERY_B2B_PROVIDER))
    .limit(1)

  const metadata = stored?.metadata || {}
  const freightMode = clean(
    process.env.DELHIVERY_B2B_FREIGHT_MODE || metadata.freight_mode,
  ).toLowerCase()

  return {
    apiBase:
      clean(process.env.DELHIVERY_B2B_API_BASE || stored?.apiBase) ||
      DEFAULT_DELHIVERY_B2B_API_BASE,
    username: clean(process.env.DELHIVERY_B2B_USERNAME || stored?.username),
    password: clean(process.env.DELHIVERY_B2B_PASSWORD || stored?.password),
    clientId: clean(process.env.DELHIVERY_B2B_CLIENT_ID || stored?.clientId),
    warehouseId: clean(
      process.env.DELHIVERY_B2B_WAREHOUSE_ID || metadata.warehouse_id,
    ),
    freightMode: freightMode === 'fod' ? 'fod' : 'fop',
    fmPickup: asBoolean(
      process.env.DELHIVERY_B2B_FM_PICKUP ?? metadata.fm_pickup,
      true,
    ),
  }
}
