import { Response } from 'express'
import {
  getIncomingPickups,
  getPendingActions,
  getInvoiceStatus,
  getTopDestinations,
  getCourierDistribution,
  getMerchantDashboardStats,
} from '../models/services/dashboard.service'
import { getAdminOpsAnalytics } from '../models/services/adminOpsAnalytics.service'
import { getMerchantScopedUserId } from '../utils/merchantScope'

const APP_TIME_ZONE = 'Asia/Kolkata'

const getDateKeyInAppTimeZone = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const partMap = new Map(parts.map((part) => [part.type, part.value]))
  return `${partMap.get('year')}-${partMap.get('month')}-${partMap.get('day')}`
}

const parseDateOnly = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return parsed
}

const parseDashboardDate = (value: unknown) => {
  const normalized = String(value || '').trim()
  if (!normalized) return undefined

  const dateOnly = parseDateOnly(normalized)
  if (dateOnly === null) return null

  const parsed = dateOnly === undefined ? new Date(normalized) : dateOnly
  if (Number.isNaN(parsed.getTime())) return null

  const now = new Date()
  if (getDateKeyInAppTimeZone(parsed) > getDateKeyInAppTimeZone(now)) return null

  return parsed
}

export const getHomePickups = async (req: any, res: Response) => {
  try {
    const userId = getMerchantScopedUserId(req)

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const pickups = await getIncomingPickups(userId)

    return res.json({ success: true, pickups })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Failed to fetch pickups' })
  }
}

export const getDashboardPendingActions = async (req: any, res: Response) => {
  try {
    const userId = getMerchantScopedUserId(req)

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const pendingActions = await getPendingActions(userId)

    return res.json({ success: true, ...pendingActions })
  } catch (error) {
    console.error('Error fetching pending actions:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch pending actions' })
  }
}

export const getDashboardInvoiceStatus = async (req: any, res: Response) => {
  try {
    const userId = getMerchantScopedUserId(req)

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const invoiceStatus = await getInvoiceStatus(userId)

    return res.json({ success: true, status: invoiceStatus })
  } catch (error) {
    console.error('Error fetching invoice status:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch invoice status' })
  }
}

export const getDashboardTopDestinations = async (req: any, res: Response) => {
  try {
    const userId = getMerchantScopedUserId(req)
    const limit = parseInt((req.query.limit as string) || '10')

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const destinations = await getTopDestinations(userId, limit)

    return res.json({ success: true, destinations })
  } catch (error) {
    console.error('Error fetching top destinations:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch top destinations' })
  }
}

export const getDashboardCourierDistribution = async (req: any, res: Response) => {
  try {
    const userId = getMerchantScopedUserId(req)

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const distribution = await getCourierDistribution(userId)

    return res.json({ success: true, distribution })
  } catch (error) {
    console.error('Error fetching courier distribution:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch courier distribution' })
  }
}

export const getMerchantDashboardStatsController = async (req: any, res: Response) => {
  try {
    const userId = getMerchantScopedUserId(req)

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const selectedDate = parseDashboardDate(req.query.date)
    if (selectedDate === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid dashboard date that is not in the future.',
      })
    }

    const stats = await getMerchantDashboardStats(userId, selectedDate)

    return res.json(stats)
  } catch (error) {
    console.error('Error fetching merchant dashboard stats:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch merchant dashboard stats' })
  }
}

export const getMerchantOpsAnalyticsController = async (req: any, res: Response) => {
  try {
    const userId = getMerchantScopedUserId(req)

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const data = await getAdminOpsAnalytics({
      fromDate: req.query.fromDate || undefined,
      toDate: req.query.toDate || undefined,
      userId,
      accountId: req.query.accountId || undefined,
      courier: req.query.courier || undefined,
      zone: req.query.zone || undefined,
      search: req.query.search || undefined,
    })

    return res.json(data)
  } catch (error: any) {
    console.error('[getMerchantOpsAnalyticsController]', error)
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch merchant ops analytics',
    })
  }
}
