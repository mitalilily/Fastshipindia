import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { logoutApi } from '../../api/auth'
import { clearAuthTokens, getAuthTokens, setAuthTokens } from '../../api/tokenVault'
import { useUserProfile } from '../../hooks/User/useUserProfile'
import type { IUserProfileDB } from '../../types/user.types'
import { emptyUserProfile } from '../../utils/utility'
import { DEMO_SESSION_EMAIL_KEY } from '../../utils/demoAuth'

const AUTH_USER_CACHE_KEY = 'fastship-auth-user-cache:v1'

const readCachedAuthUser = (): IUserProfileDB | null => {
  if (typeof window === 'undefined') return null

  try {
    const cached = sessionStorage.getItem(AUTH_USER_CACHE_KEY)
    if (!cached) return null
    const parsed = JSON.parse(cached) as Partial<IUserProfileDB>
    if (!parsed.id || !parsed.userId) return null

    return {
      ...emptyUserProfile,
      ...parsed,
      companyInfo: {
        ...emptyUserProfile.companyInfo,
        ...(parsed.companyInfo || {}),
      },
    }
  } catch {
    return null
  }
}

const cacheAuthUser = (user: IUserProfileDB) => {
  if (typeof window === 'undefined') return

  const safeUserSnapshot: Partial<IUserProfileDB> = {
    id: user.id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    onboardingStep: user.onboardingStep,
    monthlyOrderCount: user.monthlyOrderCount,
    onboardingComplete: user.onboardingComplete,
    profileComplete: user.profileComplete,
    salesChannels: user.salesChannels,
    businessType: user.businessType,
    approved: user.approved,
    approvedAt: user.approvedAt,
    rejectionReason: user.rejectionReason,
    currentPlanId: user.currentPlanId,
    currentPlanName: user.currentPlanName,
    companyInfo: {
      ...emptyUserProfile.companyInfo,
      businessName: user.companyInfo?.businessName || '',
      brandName: user.companyInfo?.brandName || '',
      contactPerson: user.companyInfo?.contactPerson || '',
      contactEmail: user.companyInfo?.contactEmail || '',
      companyEmail: user.companyInfo?.companyEmail || '',
      companyLogoUrl: user.companyInfo?.companyLogoUrl || '',
    },
    domesticKyc: user.domesticKyc
      ? { status: user.domesticKyc.status, updatedAt: null }
      : emptyUserProfile.domesticKyc,
    bankDetails: user.bankDetails
      ? { count: user.bankDetails.count, primaryAccount: null }
      : emptyUserProfile.bankDetails,
    submittedAt: user.submittedAt,
    updatedAt: user.updatedAt,
  }

  try {
    sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(safeUserSnapshot))
  } catch {
    // Storage can be unavailable in private browsing; authentication still works normally.
  }
}

const clearCachedAuthUser = () => {
  if (typeof window !== 'undefined') sessionStorage.removeItem(AUTH_USER_CACHE_KEY)
}

/* ---------- context shape ---------- */
interface AuthCtx {
  setUserId: Dispatch<SetStateAction<string>>
  userId: string
  user: IUserProfileDB
  loading: boolean
  isAuthenticated: boolean
  setTokens: (access: string, refresh: string, keepSignedIn?: boolean) => void
  startDemoSession: (email: string) => void
  clearTokens: () => void
  logout: () => Promise<void>
  refetchUser: () => void
  walletBalance: number | null
  setWalletBalance: Dispatch<SetStateAction<number | null>>
}

export const AuthContext = createContext<AuthCtx | undefined>(undefined)

/* ---------- provider ---------- */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()

  const { accessToken, refreshToken } = getAuthTokens()
  const hasTokens = !!accessToken && !!refreshToken
  const [demoEmail, setDemoEmail] = useState(() =>
    typeof window === 'undefined' ? '' : sessionStorage.getItem(DEMO_SESSION_EMAIL_KEY) || '',
  )
  const hasDemoSession = Boolean(demoEmail)

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hasTokens || hasDemoSession)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [userId, setUserId] = useState('')
  const [cachedUser, setCachedUser] = useState<IUserProfileDB | null>(readCachedAuthUser)

  const {
    data: user,
    isFetching: userFetching,
    refetch: refetchUser,
  } = useUserProfile(isAuthenticated && !hasDemoSession)

  const demoUser: IUserProfileDB | null = hasDemoSession
    ? {
        ...emptyUserProfile,
        id: 'fastship-demo-user',
        userId: 'fastship-demo-user',
        name: 'FastShip Merchant',
        email: demoEmail,
        onboardingStep: -1,
        onboardingComplete: true,
        profileComplete: true,
        approved: true,
        companyInfo: {
          ...emptyUserProfile.companyInfo,
          businessName: 'FastShip Demo',
          brandName: 'FastShip',
          contactPerson: 'Merchant',
          contactEmail: demoEmail,
          companyEmail: demoEmail,
          POCEmailVerified: true,
        },
      }
    : null

  useEffect(() => {
    // If we successfully fetched a user, ensure auth is marked as true.
    if (user?.id) {
      setIsAuthenticated(true)
      setCachedUser(user)
      cacheAuthUser(user)
    }
    // Do NOT automatically mark user as unauthenticated on generic errors here.
    // Auth state should primarily follow presence of valid tokens; 401 handling
    // is done in axios interceptors which clear tokens and redirect as needed.
  }, [user])

  const setTokens = (access: string, refresh: string, keepSignedIn?: boolean) => {
    sessionStorage.removeItem(DEMO_SESSION_EMAIL_KEY)
    clearCachedAuthUser()
    setCachedUser(null)
    setDemoEmail('')
    setAuthTokens(access, refresh, keepSignedIn)
    setIsAuthenticated(true)
    refetchUser()
  }

  const clearTokens = () => {
    clearAuthTokens()
    clearCachedAuthUser()
    setCachedUser(null)
    sessionStorage.removeItem(DEMO_SESSION_EMAIL_KEY)
    setDemoEmail('')
    setIsAuthenticated(false)
    queryClient.removeQueries({ queryKey: ['userInfo'] })
    queryClient.removeQueries({ queryKey: ['userProfile'] })
    queryClient.removeQueries({ queryKey: ['walletBalance'] })
  }

  const startDemoSession = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    clearAuthTokens()
    clearCachedAuthUser()
    setCachedUser(null)
    sessionStorage.setItem(DEMO_SESSION_EMAIL_KEY, normalizedEmail)
    sessionStorage.setItem('activeEmail', normalizedEmail)
    setDemoEmail(normalizedEmail)
    setUserId('fastship-demo-user')
    setIsAuthenticated(true)
    queryClient.removeQueries({ queryKey: ['userInfo'] })
    queryClient.removeQueries({ queryKey: ['userProfile'] })
  }

  const logout = async () => {
    try {
      if (!hasDemoSession) await logoutApi()
    } catch (e) {
      console.error('Logout error ignored:', e)
    }
    clearTokens()
    window.location.href = '/login'
  }

  const value: AuthCtx = {
    user: demoUser ?? user ?? cachedUser ?? { ...emptyUserProfile },
    loading: hasDemoSession ? false : userFetching && !user?.id && !cachedUser?.id,
    isAuthenticated,
    setUserId,
    setTokens,
    startDemoSession,
    clearTokens,
    userId,
    logout,
    refetchUser,
    walletBalance,
    setWalletBalance,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ---------- hook ---------- */
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
