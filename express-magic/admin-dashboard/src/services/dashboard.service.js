import api from './axios'

const DASHBOARD_CACHE_PREFIX = 'fastship-admin-dashboard:'

const cacheKey = (filters) =>
  `${DASHBOARD_CACHE_PREFIX}${JSON.stringify(filters || {})}`

export const getCachedAdminDashboardStats = (filters = {}) => {
  try {
    const raw = sessionStorage.getItem(cacheKey(filters))
    if (!raw) return undefined
    const cached = JSON.parse(raw)
    if (!cached?.data || Date.now() - cached.savedAt > 30 * 1000) {
      sessionStorage.removeItem(cacheKey(filters))
      return undefined
    }
    return cached.data
  } catch {
    return undefined
  }
}

export const getAdminDashboardStats = async (filters = {}) => {
  const { data } = await api.get('/admin/dashboard/stats', { params: filters })
  try {
    sessionStorage.setItem(
      cacheKey(filters),
      JSON.stringify({ data, savedAt: Date.now() }),
    )
  } catch {
    // Dashboard data still works when browser storage is unavailable.
  }
  return data
}
