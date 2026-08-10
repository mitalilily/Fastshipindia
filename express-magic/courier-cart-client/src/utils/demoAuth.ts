export const DEMO_OTP = '246810'

const DEMO_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'fastshipindia-1.onrender.com',
])

export const isDemoLoginEnabled = () =>
  import.meta.env.DEV ||
  String(import.meta.env.VITE_DEMO_OTP_ENABLED || '').toLowerCase() === 'true' ||
  (typeof window !== 'undefined' && DEMO_HOSTS.has(window.location.hostname.toLowerCase()))
