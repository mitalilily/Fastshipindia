import { alpha } from '@mui/material/styles'

export const brand = {
  navy: '#0B3A78',
  red: '#E31B23',
  ink: '#0B3A78',
  inkSoft: '#64748B',
  page: '#FAFBFE',
  cream: '#F8FAFE',
  sky: '#E2E8F0',
  aqua: '#EAF1FB',
  accent: '#E31B23',
  gold: '#0B3A78',
  line: '#E2E8F0',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.88)',
  success: '#0B3A78',
  warning: '#E31B23',
  danger: '#E31B23',
  shadow: '0 28px 60px rgba(68, 92, 138, 0.14)',
}

export const brandFonts = {
  body: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  display: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
}

export const brandIdentity = {
  name: 'FastShip',
  shortName: 'FastShip',
  tagline: 'Fast. Safe. Worldwide.',
  supportEmail: 'support@fastship.in',
  supportPhone: '+91 84878 81121',
  supportAddress: 'Ahmedabad, Gujarat, India',
  logoSrc: '/assets/fastshipindia-logo-green-navy.jpg',
  markSrc: '/assets/fastshipindia-logo-green-navy.jpg',
}

export const brandGradients = {
  page: `
    radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.96), transparent 30%),
    radial-gradient(circle at 100% 0%, rgba(215, 226, 243, 0.72), transparent 32%),
    linear-gradient(180deg, #E8EEF8 0%, #F6F8FC 52%, #EEF2FA 100%)
  `,
  button: 'linear-gradient(135deg, #0B3A78 0%, #E31B23 100%)',
  hero: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(234,240,249,0.94) 58%, rgba(216,226,241,0.9) 100%)',
  surface: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,254,0.98) 100%)',
  softSurface: 'linear-gradient(180deg, rgba(250,252,255,0.98) 0%, rgba(240,245,252,0.98) 100%)',
  analytics: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(235,241,249,0.95) 56%, rgba(227,27,35,0.08) 100%)',
}

export const brandEffects = {
  ring: `0 0 0 4px ${alpha(brand.accent, 0.2)}`,
  border: `1px solid ${alpha(brand.line, 0.92)}`,
  focusBorder: `1px solid ${alpha(brand.ink, 0.34)}`,
  mutedBorder: `1px solid ${alpha(brand.ink, 0.08)}`,
}


