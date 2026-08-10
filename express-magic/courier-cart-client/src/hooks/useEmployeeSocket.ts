import { useEffect } from 'react'
import { useAuth } from '../context/auth/AuthContext'

export const useEmployeeSocket = () => {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    let cancelled = false
    let disconnect: (() => void) | undefined

    const initSocket = async () => {
      const [{ getEmployeeByUserId }, socketModule] = await Promise.all([
        import('../api/employee.service'),
        import('./User/useUserOnline'),
      ])
      if (cancelled) return

      disconnect = socketModule.disconnectSocket
      socketModule.registerUserSocket({ id: user.userId, role: 'customer' })

      try {
        const employee = await getEmployeeByUserId(user.userId)
        if (!cancelled && employee?.employee?.isActive) {
          socketModule.registerUserSocket({ id: user.userId, role: 'employee' })
        }
      } catch {
        // Most merchant accounts are not employees; their notification socket remains active.
      }
    }

    void initSocket().catch(() => {
      // Realtime presence is optional and must never delay the workspace.
    })

    return () => {
      cancelled = true
      disconnect?.()
    }
  }, [isAuthenticated, user?.id, user?.userId])
}
