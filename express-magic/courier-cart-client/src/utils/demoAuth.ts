export const DEMO_OTP = '246810'
export const DEMO_PASSWORD_STORAGE_KEY = 'fastship_demo_password'
export const REGISTRATION_DRAFT_STORAGE_KEY = 'fastship_registration_draft'

export type RegistrationDraft = {
  userType: 'individual' | 'business'
  name: string
  email: string
  phone: string
}

export const setRegistrationDraft = (draft: RegistrationDraft) => {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(REGISTRATION_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export const getRegistrationDraft = (): RegistrationDraft | null => {
  if (typeof window === 'undefined') return null

  try {
    const value = sessionStorage.getItem(REGISTRATION_DRAFT_STORAGE_KEY)
    return value ? (JSON.parse(value) as RegistrationDraft) : null
  } catch {
    sessionStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY)
    return null
  }
}

const DEMO_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'fastshipindia-1.onrender.com',
])

export const isDemoLoginEnabled = () =>
  import.meta.env.DEV ||
  String(import.meta.env.VITE_DEMO_OTP_ENABLED || '').toLowerCase() === 'true' ||
  (typeof window !== 'undefined' && DEMO_HOSTS.has(window.location.hostname.toLowerCase()))
