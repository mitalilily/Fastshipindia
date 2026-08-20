import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelAdminOrder,
  fetchAllOrders,
  regenerateAdminOrderDocuments,
  updateAdminOrderStatus,
} from 'services/order.service'

export const useOrders = (page, limit, filters) => {
  return useQuery({
    queryKey: ['orders', page, limit, filters],
    queryFn: () => fetchAllOrders(page, limit, filters),
    keepPreviousData: true,
  })
}

export const useCancelOrderMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId) => cancelAdminOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export const useRegenerateOrderDocumentsMutation = () => {
  return useMutation({
    mutationFn: ({ orderId, regenerateLabel = true, regenerateInvoice = true }) =>
      regenerateAdminOrderDocuments(orderId, { regenerateLabel, regenerateInvoice }),
  })
}

export const useUpdateOrderStatusMutation = () => {
  return useMutation({
    mutationFn: ({ orderId, status, note }) => updateAdminOrderStatus(orderId, { status, note }),
  })
}
