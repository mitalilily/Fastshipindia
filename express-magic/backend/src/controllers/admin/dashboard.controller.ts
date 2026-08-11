import { Response } from 'express'
import { getAdminDashboardStats } from '../../models/services/adminDashboard.service'

const dashboardCache = new Map<
  string,
  { expiresAt: number; data?: unknown; pending?: Promise<unknown> }
>()
const DASHBOARD_CACHE_TTL_MS = 45 * 1000

export const getAdminDashboardStatsController = async (req: any, res: Response) => {
  const filters = {
    range: String(req.query?.range || '30d'),
    courier: String(req.query?.courier || 'all'),
    paymentType: String(req.query?.paymentType || 'all'),
  }
  const cacheKey = JSON.stringify(filters)

  try {
    const cached = dashboardCache.get(cacheKey)

    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')

    if (cached?.data && cached.expiresAt > Date.now()) {
      res.setHeader('X-FastShip-Cache', 'HIT')
      return res.json(cached.data)
    }

    const pending = cached?.pending || getAdminDashboardStats(filters)
    dashboardCache.set(cacheKey, {
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      pending,
    })

    const data = await pending
    dashboardCache.set(cacheKey, {
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      data,
    })
    if (dashboardCache.size > 24) {
      const oldestKey = dashboardCache.keys().next().value
      if (oldestKey) dashboardCache.delete(oldestKey)
    }
    res.setHeader('X-FastShip-Cache', cached?.pending ? 'COALESCED' : 'MISS')
    return res.json(data)
  } catch (error: any) {
    dashboardCache.delete(cacheKey)
    console.error('[getAdminDashboardStatsController]', error)
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch admin dashboard stats',
    })
  }
}
