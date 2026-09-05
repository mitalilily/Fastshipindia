import { alpha, Box, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { motion } from 'framer-motion'
import React from 'react'
import { TbSparkles } from 'react-icons/tb'
import { brand, brandGradients } from '../../../theme/brand'

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

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        border: `1px solid ${isDark ? alpha('#f8fafc', 0.12) : alpha(brand.ink, 0.1)}`,
        background: isDark
          ? 'linear-gradient(135deg, #151b23 0%, #111822 100%)'
          : `
            linear-gradient(90deg, ${alpha(brand.ink, 0.05)} 0%, transparent 28%),
            linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,254,0.96) 54%, rgba(237,242,250,0.98) 100%)
          `,
        px: hasSubtitle ? { xs: 2, sm: 2.8 } : { xs: 1.6, sm: 1.8 },
        py: hasSubtitle ? { xs: 2, sm: 2.4 } : { xs: 1.25, sm: 1.35 },
        minHeight: hasSubtitle ? { xs: 112, sm: 132 } : 'auto',
        boxShadow: isDark
          ? '0 16px 34px rgba(0,0,0,0.22)'
          : '0 18px 42px rgba(15,44,67,0.08)',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          width: 5,
          background: `linear-gradient(180deg, ${brand.ink} 0%, ${brand.accent} 100%)`,
        },
        '&:after': {
          content: '""',
          position: 'absolute',
          right: { xs: -36, sm: -10 },
          top: -50,
          width: { xs: 180, sm: 260 },
          height: { xs: 180, sm: 220 },
          background: `
            linear-gradient(135deg, ${alpha(brand.accent, isDark ? 0.18 : 0.1)} 0%, transparent 54%),
            linear-gradient(180deg, ${alpha(brand.ink, isDark ? 0.18 : 0.08)} 0%, transparent 72%)
          `,
          transform: 'rotate(12deg)',
          borderRadius: '8px',
        },
      }}
    >
      <Stack
        spacing={1.2}
        textAlign={center ? 'center' : 'left'}
        position="relative"
        zIndex={1}
        justifyContent="center"
        minHeight={hasSubtitle ? { xs: 72, sm: 84 } : 'auto'}
      >
        <Stack
          direction="row"
          spacing={1.4}
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
                width: hasSubtitle ? { xs: 42, sm: 46 } : 36,
                height: hasSubtitle ? { xs: 42, sm: 46 } : 36,
                borderRadius: '8px',
                background: isDark
                  ? `linear-gradient(135deg, ${brand.ink} 0%, ${alpha(brand.accent, 0.78)} 100%)`
                  : brandGradients.button,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${alpha('#FFFFFF', 0.42)}`,
                boxShadow: isDark
                  ? `0 14px 24px ${alpha('#000000', 0.24)}`
                  : `0 14px 28px ${alpha(brand.ink, 0.18)}`,
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
              fontSize={fontSize ?? { xs: '1.45rem', md: '1.95rem' }}
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
              fontSize: { xs: '0.9rem', md: '0.96rem' },
              maxWidth: center ? 820 : 760,
              mx: center ? 'auto' : 0,
              lineHeight: 1.68,
              pl: center ? 0 : { xs: 0, sm: 7.5 },
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
