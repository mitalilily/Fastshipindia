import { courierLogos, defaultLogo, deliveryOneLogo } from './constants'

type CourierLike =
  | string
  | null
  | undefined
  | {
      name?: string | null
      courier_name?: string | null
      id?: string | number | null
      courier_id?: string | number | null
      courierId?: string | number | null
      displayName?: string | null
      serviceProvider?: string | null
      service_provider?: string | null
      integration_type?: string | null
      provider?: string | null
      mode?: string | null
      shipping_mode?: string | null
      service_type?: string | null
    }

export const DELHIVERY_SURFACE_DISPLAY_NAME = 'Delhivery Surface'
export const DELHIVERY_EXPRESS_DISPLAY_NAME = 'Delhivery Express'
export const DELHIVERY_B2B_DISPLAY_NAME = 'Delhivery B2B (LTL)'
const DELIVERY_ONE_LOGO = deliveryOneLogo
const DELIVERY_ONE_SURFACE_ID = 99
const DELIVERY_ONE_EXPRESS_ID = 100

export const DELHIVERY_COURIER_FILTER_OPTIONS_BY_ID = [
  { label: DELHIVERY_SURFACE_DISPLAY_NAME, value: String(DELIVERY_ONE_SURFACE_ID) },
  { label: DELHIVERY_EXPRESS_DISPLAY_NAME, value: String(DELIVERY_ONE_EXPRESS_ID) },
]

export const DELHIVERY_COURIER_FILTER_OPTIONS_BY_NAME = [
  { label: DELHIVERY_SURFACE_DISPLAY_NAME, value: DELHIVERY_SURFACE_DISPLAY_NAME },
  { label: DELHIVERY_EXPRESS_DISPLAY_NAME, value: DELHIVERY_EXPRESS_DISPLAY_NAME },
]

const normalizeToken = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

const getCourierValues = (courier: CourierLike) => {
  if (typeof courier === 'string') return [courier]
  if (!courier) return []

  return [
    courier.displayName,
    courier.courier_name,
    courier.name,
    courier.serviceProvider,
    courier.service_provider,
    courier.integration_type,
    courier.provider,
    courier.mode,
    courier.shipping_mode,
    courier.service_type,
  ].filter(Boolean) as string[]
}

const isDeliveryOneValue = (value?: string | null) => {
  const normalized = normalizeToken(value)
  return (
    normalized === 'deliveryone' ||
    normalized === 'delivery1' ||
    normalized === 'delhiveryone' ||
    normalized === 'delhivery' ||
    normalized.startsWith('deliveryone') ||
    normalized.startsWith('delhiveryone') ||
    normalized.startsWith('delhiverysurface') ||
    normalized.startsWith('delhiveryexpress') ||
    normalized.startsWith('delhiveryair')
  )
}

const isDelhiveryB2BValue = (value?: string | null) => {
  const normalized = normalizeToken(value)
  return (
    normalized === 'delhiveryb2b' ||
    normalized === 'delhiveryltl' ||
    normalized.includes('delhiveryb2b') ||
    normalized.includes('delhiveryltl') ||
    normalized.includes('delhiveryfreight')
  )
}

const isShipmozoValue = (value?: string | null) => normalizeToken(value).includes('shipmozo')
const isBigshipValue = (value?: string | null) => normalizeToken(value).includes('bigship')
const isMovinValue = (value?: string | null) => normalizeToken(value).includes('movin')
const isBlueDartValue = (value?: string | null) => normalizeToken(value).includes('bluedart')
const isDpWorldValue = (value?: string | null) => normalizeToken(value).includes('dpworld')
const isRivigoValue = (value?: string | null) => normalizeToken(value).includes('rivigo')
const isTciValue = (value?: string | null) => normalizeToken(value).includes('tci')
const isGatiValue = (value?: string | null) => normalizeToken(value).includes('gati')
const isDtdcValue = (value?: string | null) => normalizeToken(value).includes('dtdc')

const getProviderValues = (courier: CourierLike) => {
  if (typeof courier === 'string' || !courier) return []

  return [
    courier.integration_type,
    courier.provider,
    courier.serviceProvider,
    courier.service_provider,
  ].filter(Boolean) as string[]
}

const getProviderDisplayName = (
  courier: CourierLike,
  matcher: (value?: string | null) => boolean,
  fallback: string,
) => {
  const values = getCourierValues(courier)
  const ownName =
    typeof courier === 'string'
      ? courier
      : courier?.displayName || courier?.courier_name || courier?.name || ''

  if (matcher(ownName)) return ownName
  return values.some(matcher) ? fallback : ''
}

export const isDelhiveryCourier = (courier: CourierLike) =>
  getCourierValues(courier).some((value) => isDeliveryOneValue(value))

const getDeliveryOneVariant = (courier: CourierLike) => {
  const values = getCourierValues(courier)
  const normalizedValues = values.map(normalizeToken)

  if (normalizedValues.some((value) => value.includes('surface') || value.includes('ground'))) {
    return 'surface'
  }

  if (normalizedValues.some((value) => value.includes('express') || value.includes('air'))) {
    return 'express'
  }

  if (typeof courier !== 'string' && courier) {
    const courierId = Number(courier.id ?? courier.courier_id ?? courier.courierId)
    if (courierId === DELIVERY_ONE_SURFACE_ID) return 'surface'
    if (courierId === DELIVERY_ONE_EXPRESS_ID) return 'express'
  }

  return ''
}

const getDeliveryOneDisplayName = (courier: CourierLike) => {
  const variant = getDeliveryOneVariant(courier)
  if (variant === 'express') return DELHIVERY_EXPRESS_DISPLAY_NAME
  return DELHIVERY_SURFACE_DISPLAY_NAME
}

export const getCourierDisplayName = (courier: CourierLike, fallback = 'Unknown Courier') => {
  const values = getCourierValues(courier)
  if (getProviderValues(courier).some(isShipmozoValue)) {
    return getProviderDisplayName(courier, isShipmozoValue, 'Shipmozo') || 'Shipmozo'
  }
  if (getProviderValues(courier).some(isBigshipValue)) {
    return getProviderDisplayName(courier, isBigshipValue, 'Bigship') || 'Bigship'
  }
  if (getProviderValues(courier).some(isMovinValue)) {
    return getProviderDisplayName(courier, isMovinValue, 'Movin') || 'Movin'
  }
  if (getProviderValues(courier).some(isBlueDartValue)) {
    return getProviderDisplayName(courier, isBlueDartValue, 'Blue Dart') || 'Blue Dart'
  }
  if (getProviderValues(courier).some(isDpWorldValue)) return getProviderDisplayName(courier, isDpWorldValue, 'DP World') || 'DP World'
  if (getProviderValues(courier).some(isRivigoValue)) return getProviderDisplayName(courier, isRivigoValue, 'Rivigo') || 'Rivigo'
  if (getProviderValues(courier).some(isTciValue)) return getProviderDisplayName(courier, isTciValue, 'TCI Express') || 'TCI Express'
  if (getProviderValues(courier).some(isGatiValue)) return getProviderDisplayName(courier, isGatiValue, 'Gati') || 'Gati'
  if (getProviderValues(courier).some(isDtdcValue)) return getProviderDisplayName(courier, isDtdcValue, 'DTDC') || 'DTDC'
  if (values.some(isDelhiveryB2BValue)) return DELHIVERY_B2B_DISPLAY_NAME
  if (values.some(isShipmozoValue)) return getProviderDisplayName(courier, isShipmozoValue, 'Shipmozo') || 'Shipmozo'
  if (values.some(isBigshipValue)) return getProviderDisplayName(courier, isBigshipValue, 'Bigship') || 'Bigship'
  if (values.some(isMovinValue)) return getProviderDisplayName(courier, isMovinValue, 'Movin') || 'Movin'
  if (values.some(isBlueDartValue)) return getProviderDisplayName(courier, isBlueDartValue, 'Blue Dart') || 'Blue Dart'
  if (values.some(isDpWorldValue)) return getProviderDisplayName(courier, isDpWorldValue, 'DP World') || 'DP World'
  if (values.some(isRivigoValue)) return getProviderDisplayName(courier, isRivigoValue, 'Rivigo') || 'Rivigo'
  if (values.some(isTciValue)) return getProviderDisplayName(courier, isTciValue, 'TCI Express') || 'TCI Express'
  if (values.some(isGatiValue)) return getProviderDisplayName(courier, isGatiValue, 'Gati') || 'Gati'
  if (values.some(isDtdcValue)) return getProviderDisplayName(courier, isDtdcValue, 'DTDC') || 'DTDC'
  if (values.some(isDeliveryOneValue)) return getDeliveryOneDisplayName(courier)
  if (typeof courier === 'string') return courier || fallback
  return courier?.displayName || courier?.courier_name || courier?.name || fallback
}

export const getCourierLogo = (courier: CourierLike, fallback = defaultLogo) => {
  const values = getCourierValues(courier)
  if (values.some(isDelhiveryB2BValue)) {
    return courierLogos[DELHIVERY_SURFACE_DISPLAY_NAME] || courierLogos.deliveryone || DELIVERY_ONE_LOGO
  }

  if (values.some(isDeliveryOneValue)) {
    const displayName = getDeliveryOneDisplayName(courier)
    return courierLogos[displayName] || courierLogos.deliveryone || DELIVERY_ONE_LOGO
  }

  if (values.some(isShipmozoValue)) {
    return courierLogos.Shipmozo || fallback
  }

  if (values.some(isBigshipValue)) {
    return courierLogos.Bigship || fallback
  }

  if (values.some(isMovinValue)) {
    return courierLogos.Movin || fallback
  }

  if (values.some(isBlueDartValue)) {
    return courierLogos['Blue Dart'] || courierLogos.Bluedart || fallback
  }
  if (values.some(isDpWorldValue)) return courierLogos['DP World'] || fallback
  if (values.some(isRivigoValue)) return courierLogos.Rivigo || fallback
  if (values.some(isTciValue)) return courierLogos['TCI Express'] || fallback
  if (values.some(isGatiValue)) return courierLogos.Gati || fallback
  if (values.some(isDtdcValue)) return courierLogos.DTDC || fallback

  const normalizedValues = values.map((value) => value.toLowerCase())
  const logo = Object.entries(courierLogos || {}).find(([key]) =>
    normalizedValues.some((value) => value.includes(key.toLowerCase())),
  )?.[1]

  return logo || fallback
}
