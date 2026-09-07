import { alpha, Box, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { motion } from 'framer-motion'
import React from 'react'
import { TbSparkles } from 'react-icons/tb'

interface PageHeadingProps {
  title: string | React.ReactNode
  subtitle?: string
  center?: boolean
  fontSize?: string | number
  icon?: React.ReactNode
  eyebrow?: string
}

const normalizeHeadingText = (value: string) =>
  value
    .replace(/â€“|â€”/g, '-')
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/â€¢/g, '•')
    .replace(/â€¦/g, '...')
    .replace(/Â©/g, '©')
    .replace(/Â®/g, '®')

const getHeadingProfile = (title: string | React.ReactNode, eyebrow?: string | React.ReactNode) => {
  const key = [title, eyebrow]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()

  if (/billing|recharge|wallet|passbook|invoice|cod|remittance|ledger|credit|debit/.test(key)) {
    return {
      accent: '#0F766E',
      secondary: '#14B8A6',
      wash: '#ECFDF5',
      panel: '#F7FEFB',
    }
  }

  if (/ndr|non-delivery|failed|pending action/.test(key)) {
    return {
      accent: '#B42318',
      secondary: '#F59E0B',
      wash: '#FFF7ED',
      panel: '#FFFCF7',
    }
  }

  if (/rto|return|reverse/.test(key)) {
    return {
      accent: '#C2410C',
      secondary: '#DC2626',
      wash: '#FFF7ED',
      panel: '#FFFBF7',
    }
  }

  if (/report|analytics|dashboard|metric|insight/.test(key)) {
    return {
      accent: '#4F46E5',
      secondary: '#06B6D4',
      wash: '#EEF2FF',
      panel: '#F8FAFF',
    }
  }

  if (/order|shipment|pickup|courier|channel|integration|tracking/.test(key)) {
    return {
      accent: '#2563EB',
      secondary: '#0D9488',
      wash: '#EFF6FF',
      panel: '#F8FBFF',
    }
  }

  if (/support|ticket|help|resource/.test(key)) {
    return {
      accent: '#D97706',
      secondary: '#F59E0B',
      wash: '#FFFBEB',
      panel: '#FFFDF7',
    }
  }

  if (/weight|discrepancy|reconciliation|rate|calculator|tools/.test(key)) {
    return {
      accent: '#7C3AED',
      secondary: '#0D9488',
      wash: '#F5F3FF',
      panel: '#FBFAFF',
    }
  }

  return {
    accent: '#475569',
    secondary: '#0F766E',
    wash: '#F8FAFC',
    panel: '#FFFFFF',
  }
}

const PageHeading: React.FC<PageHeadingProps> = ({
  title,
  subtitle,
  center = false,
  fontSize,
  icon = <TbSparkles size={18} />,
  eyebrow = 'Panel',
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const normalizedTitle = typeof title === 'string' ? normalizeHeadingText(title) : title
  const normalizedSubtitle =
    typeof subtitle === 'string' ? normalizeHeadingText(subtitle) : subtitle
  const normalizedEyebrow = typeof eyebrow === 'string' ? normalizeHeadingText(eyebrow) : eyebrow
  const hasSubtitle = Boolean(normalizedSubtitle)
  const profile = getHeadingProfile(normalizedTitle, normalizedEyebrow)

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        border: `1px solid ${isDark ? alpha('#f8fafc', 0.12) : alpha(profile.accent, 0.16)}`,
        background: isDark
          ? 'linear-gradient(135deg, #151b23 0%, #111822 100%)'
          : `
            linear-gradient(90deg, ${alpha(profile.accent, 0.07)} 0%, transparent 30%),
            linear-gradient(135deg, rgba(255,255,255,0.98) 0%, ${alpha(profile.panel, 0.98)} 56%, ${alpha(profile.wash, 0.96)} 100%)
          `,
        px: hasSubtitle ? { xs: 1.5, sm: 2 } : { xs: 1.35, sm: 1.55 },
        py: hasSubtitle ? { xs: 1.3, sm: 1.55 } : { xs: 1, sm: 1.05 },
        minHeight: hasSubtitle ? { xs: 88, sm: 100 } : 'auto',
        boxShadow: isDark
          ? '0 10px 24px rgba(0,0,0,0.18)'
          : '0 10px 26px rgba(15,44,67,0.06)',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          width: 5,
          background: `linear-gradient(180deg, ${profile.accent} 0%, ${profile.secondary} 100%)`,
        },
        '&:after': {
          content: '""',
          position: 'absolute',
          right: { xs: -36, sm: -10 },
          top: -58,
          width: { xs: 150, sm: 220 },
          height: { xs: 150, sm: 178 },
          background: `
            linear-gradient(135deg, ${alpha(profile.secondary, isDark ? 0.16 : 0.1)} 0%, transparent 54%),
            linear-gradient(180deg, ${alpha(profile.accent, isDark ? 0.15 : 0.07)} 0%, transparent 72%)
          `,
          transform: 'rotate(12deg)',
          borderRadius: '8px',
        },
      }}
    >
      <Stack
        spacing={0.7}
        textAlign={center ? 'center' : 'left'}
        position="relative"
        zIndex={1}
        justifyContent="center"
        minHeight={hasSubtitle ? { xs: 58, sm: 66 } : 'auto'}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            justifyContent: center ? 'center' : 'flex-start',
          }}
        >
          <motion.div
            initial={{ rotate: -18, scale: 0.82, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            whileHover={{ rotate: 12, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <Box
              sx={{
                width: hasSubtitle ? { xs: 36, sm: 40 } : 32,
                height: hasSubtitle ? { xs: 36, sm: 40 } : 32,
                borderRadius: '8px',
                background: isDark
                  ? `linear-gradient(135deg, ${profile.accent} 0%, ${alpha(profile.secondary, 0.84)} 100%)`
                  : `linear-gradient(135deg, ${profile.accent} 0%, ${profile.secondary} 100%)`,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${alpha('#FFFFFF', 0.42)}`,
                boxShadow: isDark
                  ? `0 8px 18px ${alpha('#000000', 0.2)}`
                  : `0 8px 18px ${alpha(profile.accent, 0.14)}`,
              }}
            >
              {icon}
            </Box>
          </motion.div>
          <Stack spacing={0.4}>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: 0,
              }}
            >
              {normalizedEyebrow}
            </Typography>
            <Typography
              fontSize={fontSize ?? { xs: '1.25rem', md: '1.65rem' }}
              fontWeight={700}
              lineHeight={1.08}
              sx={{
                color: theme.palette.text.primary,
                letterSpacing: 0,
                textWrap: 'balance',
              }}
            >
              {normalizedTitle}
            </Typography>
          </Stack>
        </Stack>

        {normalizedSubtitle && (
          <Typography
            sx={{
              color: theme.palette.text.secondary,
              fontSize: { xs: '0.84rem', md: '0.9rem' },
              maxWidth: center ? 820 : 760,
              mx: center ? 'auto' : 0,
              lineHeight: 1.45,
              pl: center ? 0 : { xs: 0, sm: 6 },
            }}
          >
            {normalizedSubtitle}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

export default PageHeading
