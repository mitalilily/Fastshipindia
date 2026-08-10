import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type ClientNotification,
} from '../api/notification.api'

export const CLIENT_NOTIFICATIONS_QUERY_KEY = ['client-notifications']
const NEW_NOTIFICATION_EVENT = 'fastship:new-notification'

export const useClientNotifications = (enabled: boolean) => {
  const queryClient = useQueryClient()

  const notificationsQuery = useQuery({
    queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY,
    queryFn: getMyNotifications,
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!enabled) return

    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY })
    }

    window.addEventListener(NEW_NOTIFICATION_EVENT, refreshNotifications)
    return () => window.removeEventListener(NEW_NOTIFICATION_EVENT, refreshNotifications)
  }, [enabled, queryClient])

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY })
      const previous = queryClient.getQueryData<ClientNotification[]>(
        CLIENT_NOTIFICATIONS_QUERY_KEY,
      )

      queryClient.setQueryData<ClientNotification[]>(CLIENT_NOTIFICATIONS_QUERY_KEY, (current = []) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true, isRead: true }
            : notification,
        ),
      )

      return { previous }
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CLIENT_NOTIFICATIONS_QUERY_KEY, context.previous)
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY })
      const previous = queryClient.getQueryData<ClientNotification[]>(
        CLIENT_NOTIFICATIONS_QUERY_KEY,
      )

      queryClient.setQueryData<ClientNotification[]>(CLIENT_NOTIFICATIONS_QUERY_KEY, (current = []) =>
        current.map((notification) => ({ ...notification, read: true, isRead: true })),
      )

      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CLIENT_NOTIFICATIONS_QUERY_KEY, context.previous)
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: CLIENT_NOTIFICATIONS_QUERY_KEY }),
  })

  return {
    ...notificationsQuery,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    markingRead: markReadMutation.isPending,
    markingAllRead: markAllReadMutation.isPending,
  }
}
