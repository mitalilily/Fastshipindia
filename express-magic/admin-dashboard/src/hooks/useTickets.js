// hooks/useAdminTickets.js

import { useToast } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminGetTicketById,
  adminGetTicketMessages,
  adminGetTickets,
  adminReplyToTicket,
  adminUpdateTicket,
} from 'services/support.service'

export const useAdminTickets = ({ page = 1, limit = 10, filters = {} } = {}) => {
  return useQuery({
    queryKey: ['adminTickets', page, limit, filters],
    queryFn: () => adminGetTickets({ page, limit, filters }), // ✅ Correctly pass filters
    keepPreviousData: true,
  })
}

export const useAdminTicket = (ticketId) =>
  useQuery({
    queryKey: ['adminTicket', ticketId],
    queryFn: () => adminGetTicketById(ticketId),
    enabled: Boolean(ticketId),
  })

export const useAdminTicketMessages = (ticketId) =>
  useQuery({
    queryKey: ['adminTicketMessages', ticketId],
    queryFn: () => adminGetTicketMessages(ticketId),
    enabled: Boolean(ticketId),
  })

export const useReplyToTicket = () => {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminReplyToTicket,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminTicketMessages', variables.ticketId] })
      queryClient.invalidateQueries({ queryKey: ['adminTicket', variables.ticketId] })
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
      toast({ title: 'Reply sent', status: 'success', duration: 2500, isClosable: true })
    },
    onError: (err) => {
      toast({
        title: 'Reply could not be sent',
        description: err?.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    },
  })
}

export const useUpdateTicket = (onClose) => {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminUpdateTicket,
    onSuccess: (data) => {
      toast({
        title: 'Ticket updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      // Optionally refetch this ticket
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] })
      queryClient.invalidateQueries({ queryKey: ['adminTicket', data?.id] })
      onClose?.()
    },
    onError: (err) => {
      toast({
        title: 'Error updating ticket',
        description: err?.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    },
  })
}
