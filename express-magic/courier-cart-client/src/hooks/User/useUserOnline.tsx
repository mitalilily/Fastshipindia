import { io, type Socket } from 'socket.io-client'

const DEFAULT_SOCKET_URL = 'https://fastshipindia.onrender.com'
const LEGACY_AGGREGATOR_API_HOST = 'aggregator-backend-7gmk.onrender.com'
const PLACEHOLDER_API_HOST = 'your-backend-url.onrender.com'

const getSocketUrl = () => {
  const rawSocketUrl = import.meta.env.VITE_APP_SOCKET_URL

  try {
    if (!rawSocketUrl) return DEFAULT_SOCKET_URL

    const candidate = new URL(rawSocketUrl, window.location.origin)
    const currentHost = window.location.hostname
    const isHostedFrontend = currentHost.endsWith('onrender.com')
    const pointsBackToFrontend = candidate.hostname === currentHost
    const pointsToLegacyAggregatorApi = candidate.hostname === LEGACY_AGGREGATOR_API_HOST
    const pointsToPlaceholderApi = candidate.hostname === PLACEHOLDER_API_HOST

    if (
      (isHostedFrontend && pointsBackToFrontend) ||
      pointsToLegacyAggregatorApi ||
      pointsToPlaceholderApi
    ) {
      return DEFAULT_SOCKET_URL
    }

    return candidate.origin
  } catch {
    return DEFAULT_SOCKET_URL
  }
}

let socket: Socket | null = null

const getSocket = () => {
  if (!socket) {
    socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] })
  }

  return socket
}

let pingInterval: number | null = null
const NEW_NOTIFICATION_EVENT = 'fastship:new-notification'

const forwardNotificationToClient = (message: unknown) => {
  window.dispatchEvent(new CustomEvent(NEW_NOTIFICATION_EVENT, { detail: message }))
}

export const registerUserSocket = (user: { id: string; role: string }) => {
  const socketClient = getSocket()

  socketClient.emit('register', user.id)

  if (pingInterval) {
    window.clearInterval(pingInterval)
    pingInterval = null
  }

  if (user.role === 'employee') {
    // Ping every 10 seconds to maintain employee online status.
    pingInterval = window.setInterval(() => {
      socketClient.emit('employee_ping', user.id)
    }, 10000)
  }

  socketClient.off('new_notification', forwardNotificationToClient)
  socketClient.on('new_notification', forwardNotificationToClient)
}

export const disconnectSocket = () => {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }

  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export default getSocket
