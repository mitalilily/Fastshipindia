import { useQuery } from '@tanstack/react-query'
import {
  getIncomingPickups,
  getPendingActions,
  getInvoiceStatus,
  getTopDestinations,
  getCourierDistribution,
  getPublicLandingStats,
  getMerchantDashboardStats,
  type Pickup,
  type PendingActions,
  type InvoiceStatus,
  type TopDestination,
  type CourierDistribution,
  type PublicLandingStats,
  type MerchantDashboardStats,
} from '../api/dashboard.api'

export const usePublicLandingStats = () => {
  return useQuery<PublicLandingStats, Error>({
    queryKey: ['publicLandingStats'],
    queryFn: getPublicLandingStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

export const useIncomingPickups = () => {
  return useQuery<Pickup[], Error>({
    queryKey: ['incomingPickups'],
    queryFn: getIncomingPickups,
    refetchInterval: 60000, // ⏱ auto-refresh every 60s
    staleTime: 30000, // cache for 30s before refetch
  })
}

export const usePendingActions = () => {
  return useQuery<PendingActions, Error>({
    queryKey: ['pendingActions'],
    queryFn: getPendingActions,
    refetchInterval: 60000, // auto-refresh every 60s
    staleTime: 30000,
  })
}

export const useInvoiceStatus = () => {
  return useQuery<InvoiceStatus, Error>({
    queryKey: ['invoiceStatus'],
    queryFn: getInvoiceStatus,
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export const useTopDestinations = (limit = 10) => {
  return useQuery<TopDestination[], Error>({
    queryKey: ['topDestinations', limit],
    queryFn: () => getTopDestinations(limit),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export const useCourierDistribution = () => {
  return useQuery<CourierDistribution[], Error>({
    queryKey: ['courierDistribution'],
    queryFn: getCourierDistribution,
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

const DASHBOARD_CACHE_PREFIX = 'fastship-dashboard-cache:'

const getDashboardCacheKey = (selectedDate?: string) =>
  `${DASHBOARD_CACHE_PREFIX}${selectedDate || 'today'}`

const readDashboardCache = (selectedDate?: string): MerchantDashboardStats | undefined => {
  if (typeof window === 'undefined') return undefined

  try {
    const cached = window.sessionStorage.getItem(getDashboardCacheKey(selectedDate))
    return cached ? (JSON.parse(cached) as MerchantDashboardStats) : undefined
  } catch {
    return undefined
  }
}

export const useMerchantDashboardStats = (selectedDate?: string) => {
  return useQuery<MerchantDashboardStats, Error>({
    queryKey: ['merchantDashboardStats', selectedDate || 'today'],
    queryFn: async () => {
      const data = await getMerchantDashboardStats({
        params: selectedDate ? { date: selectedDate } : undefined,
        timeout: 12000,
      })

      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(getDashboardCacheKey(selectedDate), JSON.stringify(data))
        } catch {
          // Storage can be unavailable in private browsing; React Query still caches in memory.
        }
      }

      return data
    },
    initialData: () => readDashboardCache(selectedDate),
    initialDataUpdatedAt: () => (readDashboardCache(selectedDate) ? Date.now() - 60 * 1000 : undefined),
    placeholderData: (previousData) => previousData,
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60 * 1000,
    retry: 1,
  })
}
