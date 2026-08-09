import { alpha, Box, Button, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { BRAND } from '../../config/brand'

type StoryItem = {
  icon: ReactNode
  title: string
  description: string
}

type PublicToolStorySectionsProps = {
  eyebrow: string
  title: string
  description: string
  steps: StoryItem[]
  features: StoryItem[]
  ctaTitle: string
  ctaDescription: string
  primaryLabel: string
  primaryPath: string
  secondaryLabel: string
  secondaryPath: string
}

export default function PublicToolStorySections({
  eyebrow,
  title,
  description,
  steps,
  features,
  ctaTitle,
  ctaDescription,
  primaryLabel,
  primaryPath,
  secondaryLabel,
  secondaryPath,
}: PublicToolStorySectionsProps) {
  return (
    <>
      <Box component="section" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack alignItems="center" textAlign="center" sx={{ maxWidth: 720, mx: 'auto' }}>
          <Typography
            sx={{
              color: BRAND.colors.orange,
              fontSize: '0.76rem',
              fontWeight: 900,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Typography>
          <Typography
            component="h2"
            sx={{
              mt: 1.2,
              color: BRAND.colors.ink,
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 950,
              lineHeight: 1.05,
            }}
          >
            {title}
          </Typography>
          <Typography sx={{ mt: 1.5, color: BRAND.colors.muted, lineHeight: 1.75, fontWeight: 650 }}>
            {description}
          </Typography>
        </Stack>

        <Box
          sx={{
            mt: { xs: 3, md: 4 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(steps.length, 4)}, 1fr)` },
            gap: 2,
          }}
        >
          {steps.map((step, index) => (
            <Box
              key={step.title}
              sx={{
                position: 'relative',
                minHeight: 190,
                border: `1px solid ${alpha(BRAND.colors.teal, 0.12)}`,
                borderRadius: 1,
                bgcolor: '#FFFFFF',
                p: 2.6,
                boxShadow: '0 16px 36px rgba(7,20,47,0.055)',
              }}
            >
              <Typography
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 18,
                  color: alpha(BRAND.colors.teal, 0.15),
                  fontSize: '2rem',
                  fontWeight: 950,
                }}
              >
                0{index + 1}
              </Typography>
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1,
                  color: index % 2 === 0 ? BRAND.colors.teal : BRAND.colors.orange,
                  bgcolor:
                    index % 2 === 0
                      ? alpha(BRAND.colors.teal, 0.08)
                      : alpha(BRAND.colors.orange, 0.08),
                  fontSize: 22,
                }}
              >
                {step.icon}
              </Box>
              <Typography sx={{ mt: 2.1, color: BRAND.colors.ink, fontSize: '1rem', fontWeight: 950 }}>
                {step.title}
              </Typography>
              <Typography sx={{ mt: 0.8, color: BRAND.colors.muted, fontSize: '0.84rem', lineHeight: 1.65, fontWeight: 650 }}>
                {step.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        component="section"
        sx={{
          py: { xs: 3.5, md: 5 },
          borderTop: `1px solid ${alpha(BRAND.colors.teal, 0.1)}`,
          borderBottom: `1px solid ${alpha(BRAND.colors.teal, 0.1)}`,
        }}
      >
        <Typography
          component="h2"
          sx={{ color: BRAND.colors.ink, fontSize: { xs: '1.65rem', md: '2.3rem' }, fontWeight: 950 }}
        >
          Built for everyday shipping decisions
        </Typography>
        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: { xs: 2, lg: 3 },
          }}
        >
          {features.map((feature, index) => (
            <Stack key={feature.title} direction="row" spacing={1.5} alignItems="flex-start">
              <Box
                sx={{
                  flex: '0 0 auto',
                  width: 42,
                  height: 42,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1,
                  color: index % 2 === 0 ? BRAND.colors.teal : BRAND.colors.orange,
                  bgcolor:
                    index % 2 === 0
                      ? alpha(BRAND.colors.teal, 0.075)
                      : alpha(BRAND.colors.orange, 0.075),
                  fontSize: 20,
                }}
              >
                {feature.icon}
              </Box>
              <Box>
                <Typography sx={{ color: BRAND.colors.ink, fontSize: '0.9rem', fontWeight: 950 }}>
                  {feature.title}
                </Typography>
                <Typography sx={{ mt: 0.45, color: BRAND.colors.muted, fontSize: '0.78rem', lineHeight: 1.6, fontWeight: 650 }}>
                  {feature.description}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>
      </Box>

      <Box
        component="section"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          my: { xs: 3, md: 5 },
          minHeight: { xs: 320, md: 300 },
          display: 'grid',
          alignItems: 'center',
          borderRadius: 1,
          bgcolor: BRAND.colors.tealDark,
          color: '#FFFFFF',
          px: { xs: 3, md: 6 },
          py: { xs: 4, md: 5 },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: { xs: 10, md: 16 },
            height: '100%',
            bgcolor: BRAND.colors.orange,
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
          <Typography
            component="h2"
            sx={{
              color: '#FFFFFF',
              fontSize: { xs: '2rem', md: '3rem' },
              lineHeight: 1.05,
              fontWeight: 950,
            }}
          >
            {ctaTitle}
          </Typography>
          <Typography sx={{ mt: 1.5, maxWidth: 650, color: 'rgba(255,255,255,0.92)', lineHeight: 1.75, fontWeight: 700 }}>
            {ctaDescription}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.4} sx={{ mt: 3 }}>
            <Button
              component={Link}
              to={primaryPath}
              variant="contained"
              endIcon={<FiArrowRight />}
              sx={{
                minHeight: 48,
                px: 2.5,
                borderRadius: 1,
                bgcolor: BRAND.colors.orange,
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 900,
                '&:hover': { bgcolor: BRAND.colors.orangeDark },
              }}
            >
              {primaryLabel}
            </Button>
            <Button
              component={Link}
              to={secondaryPath}
              variant="outlined"
              sx={{
                minHeight: 48,
                px: 2.5,
                borderRadius: 1,
                borderColor: '#FFFFFF',
                color: BRAND.colors.tealDark,
                backgroundColor: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 900,
                '&:hover': { borderColor: '#FFFFFF', backgroundColor: alpha('#FFFFFF', 0.88) },
              }}
            >
              {secondaryLabel}
            </Button>
          </Stack>
        </Box>
      </Box>
    </>
  )
}
