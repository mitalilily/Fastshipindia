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

const createEmptyDashboardStats = (selectedDate?: string): MerchantDashboardStats => ({
  asOfDate: selectedDate || new Date().toISOString().slice(0, 10),
  todayOperations: { orders: 0, pending: 0, inTransit: 0, delivered: 0 },
  financial: {
    walletBalance: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    totalShippingCharges: 0,
    totalFreightCharges: 0,
    profit: 0,
    codAmount: 0,
    codRemittanceDue: 0,
    codRemittanceCredited: 0,
  },
  operational: {
    deliverySuccessRate: 0,
    ndrRate: 0,
    rtoRate: 0,
    avgDeliveryTime: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    ndrCount: 0,
    rtoCount: 0,
  },
  actions: {
    ndrCount: 0,
    rtoCount: 0,
    weightDiscrepancyCount: 0,
    openTickets: 0,
    inProgressTickets: 0,
    pendingInvoices: 0,
    pendingInvoiceAmount: 0,
    overdueInvoices: 0,
    overdueInvoiceAmount: 0,
  },
  couriers: { performance: {}, distribution: [] },
  geographic: { topDestinations: [] },
  charts: {
    ordersByDate: [],
    revenueByDate: [],
    ordersByDate30: [],
    revenueByDate30: [],
    ordersByStatus: [],
    revenueByOrderType: [],
    ordersByCourier: [],
    revenueByCourier: [],
  },
  metrics: {
    avgOrderValue: 0,
    totalPrepaidOrders: 0,
    totalCodOrders: 0,
    prepaidRevenue: 0,
    codRevenue: 0,
    topRevenueCities: [],
  },
  recentOrders: [],
  trends: {
    ordersGrowth: 0,
    revenueGrowth: 0,
    thisWeekOrders: 0,
    lastWeekOrders: 0,
    thisWeekRevenue: 0,
    lastWeekRevenue: 0,
  },
  recentActivity: { transactions: [], recentOrders: [] },
})

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
    initialData: () => readDashboardCache(selectedDate) ?? createEmptyDashboardStats(selectedDate),
    initialDataUpdatedAt: () => (readDashboardCache(selectedDate) ? Date.now() - 60_000 : 0),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
  })
}
