import { useQuery } from '@tanstack/react-query'
import {
  getAdminDashboardStats,
  getCachedAdminDashboardStats,
} from 'services/dashboard.service'

export const useDashboardStats = (filters = {}) => {
  return useQuery({
    queryKey: ['admin-dashboard-stats', filters],
    queryFn: () => getAdminDashboardStats(filters),
    initialData: () => getCachedAdminDashboardStats(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 2 * 60 * 1000,
    retry: 1,
  })
}

