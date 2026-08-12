export const DEMO_OTP = '246810'
export const DEMO_SESSION_EMAIL_KEY = 'fastship-demo-email'

const DEMO_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
])

export const isDemoLoginEnabled = () =>
  import.meta.env.DEV ||
  (typeof window !== 'undefined' &&
    DEMO_HOSTS.has(window.location.hostname.toLowerCase()) &&
    String(import.meta.env.VITE_DEMO_OTP_ENABLED || 'true').toLowerCase() !== 'false')

export const isDemoSessionActive = () =>
  typeof window !== 'undefined' &&
  isDemoLoginEnabled() &&
  Boolean(sessionStorage.getItem(DEMO_SESSION_EMAIL_KEY))
