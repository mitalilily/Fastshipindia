export const DEMO_OTP = '246810'
export const DEMO_SESSION_EMAIL_KEY = 'fastship-demo-email'

const DEMO_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'fastshipindia-1.onrender.com',
])

export const isDemoLoginEnabled = () =>
  import.meta.env.DEV ||
  String(import.meta.env.VITE_DEMO_OTP_ENABLED || '').toLowerCase() === 'true' ||
  (typeof window !== 'undefined' && DEMO_HOSTS.has(window.location.hostname.toLowerCase()))

export const isDemoSessionActive = () =>
  typeof window !== 'undefined' && Boolean(sessionStorage.getItem(DEMO_SESSION_EMAIL_KEY))
