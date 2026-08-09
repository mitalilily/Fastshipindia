import { alpha, Box, CardContent, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { FiCheckCircle, FiDollarSign, FiPackage, FiShield, FiZap } from 'react-icons/fi'
import { TbRulerMeasure, TbScale } from 'react-icons/tb'
import PublicToolStorySections from '../../components/tools/PublicToolStorySections'
import PublicToolsHeader from '../../components/tools/PublicToolsHeader'
import { BRAND } from '../../config/brand'

const { teal, tealDark, orange, muted, border } = BRAND.colors

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: '#FFFFFF',
    fontWeight: 800,
    '& fieldset': { borderColor: border },
    '&:hover fieldset': { borderColor: teal },
    '&.Mui-focused fieldset': { borderColor: teal, borderWidth: 1 },
  },
  '& .MuiInputLabel-root': { fontWeight: 800, color: '#32445F' },
}

export default function WeightCalculator() {
  const [length, setLength] = useState('24')
  const [breadth, setBreadth] = useState('18')
  const [height, setHeight] = useState('12')
  const [actualWeight, setActualWeight] = useState('0.8')
  const [divisor, setDivisor] = useState('5000')

  const calculation = useMemo(() => {
    const l = Number(length) || 0
    const b = Number(breadth) || 0
    const h = Number(height) || 0
    const actual = Number(actualWeight) || 0
    const divisorValue = Number(divisor) || 5000
    const volumetric = l > 0 && b > 0 && h > 0 ? (l * b * h) / divisorValue : 0
    const minimum = 0.5
    const chargeable = Math.max(actual, volumetric, minimum)
    const source =
      chargeable === volumetric ? 'Volumetric weight' : chargeable === actual ? 'Actual weight' : 'Minimum slab'

    return {
      volumetric,
      actual,
      chargeable,
      source,
      volume: l * b * h,
    }
  }, [actualWeight, breadth, divisor, height, length])

  const resultCards = [
    {
      label: 'Actual Weight',
      value: `${calculation.actual.toFixed(2)} kg`,
      icon: <TbScale />,
      color: teal,
      bg: alpha(teal, 0.08),
    },
    {
      label: 'Volumetric Weight',
      value: `${calculation.volumetric.toFixed(2)} kg`,
      icon: <TbRulerMeasure />,
      color: orange,
      bg: alpha(orange, 0.08),
    },
    {
      label: 'Chargeable Weight',
      value: `${calculation.chargeable.toFixed(2)} kg`,
      icon: <FiCheckCircle />,
      color: tealDark,
      bg: alpha(teal, 0.1),
    },
  ]

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 86% 10%, rgba(237,28,36,0.13), transparent 28%), radial-gradient(circle at 12% 24%, rgba(6,42,91,0.12), transparent 30%), linear-gradient(180deg, #FFFFFF 0%, #F5F8FC 48%, #EEF4FB 100%)',
      }}
    >
      <PublicToolsHeader />
      <Stack
        component="main"
        sx={{
          width: '100%',
          maxWidth: 1580,
          mx: 'auto',
          px: { xs: 1.5, sm: 2.5, md: 4 },
          py: { xs: 2.5, md: 4 },
        }}
        spacing={3}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(0,0.9fr) minmax(620px,1.1fr)',
            },
            gap: { xs: 2.4, md: 3.5 },
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: { xs: 4, md: 5 },
              border: `1px solid ${alpha('#07142F', 0.13)}`,
              p: { xs: 3, md: 5 },
              minHeight: { xs: 440, md: 700 },
              background:
                'linear-gradient(rgba(6,42,91,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(6,42,91,0.055) 1px, transparent 1px), #FFFFFF',
              backgroundSize: '44px 44px',
              boxShadow: '0 30px 90px rgba(7,20,47,0.12)',
            }}
          >
            <Typography
              sx={{
                color: orange,
                fontSize: '0.78rem',
                fontWeight: 900,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Weight clarity
            </Typography>
            <Typography
              component="h1"
              sx={{
                mt: 2.5,
                color: '#07142F',
                fontSize: { xs: '3rem', md: '5.45rem' },
                fontWeight: 950,
                letterSpacing: '-0.06em',
                lineHeight: 0.94,
              }}
            >
              Measure right.
              <Box component="span" sx={{ display: 'block', color: teal }}>
                Ship lighter.
              </Box>
            </Typography>
            <Typography
              sx={{
                mt: 3,
                maxWidth: 560,
                color: '#31415B',
                fontSize: { xs: '1rem', md: '1.12rem' },
                fontWeight: 650,
                lineHeight: 1.8,
              }}
            >
              Compare actual and volumetric weight before booking so your shipment uses the right slab from the start.
            </Typography>

            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                left: { xs: -42, md: -24 },
                right: { xs: -42, md: -24 },
                bottom: { xs: -8, md: -12 },
                height: { xs: 250, md: 350 },
              }}
            >
              <Box
                component="img"
                src="/images/weight-tool-3d.webp"
                loading="lazy"
                decoding="async"
                alt=""
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center bottom',
                }}
              />
            </Box>
          </Box>

          <CardContent
            sx={{
              alignSelf: 'center',
              borderRadius: { xs: 3, md: 4 },
              border: `1px solid ${alpha('#07142F', 0.12)}`,
              boxShadow: '0 24px 70px rgba(7, 20, 47, 0.1)',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(18px)',
              p: { xs: 2.4, md: 4 },
            }}
          >
            <Typography
              sx={{
                color: orange,
                fontSize: '0.76rem',
                fontWeight: 900,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Weight calculator
            </Typography>
            <Typography
              sx={{
                mt: 1.2,
                color: '#07142F',
                fontSize: { xs: '1.8rem', md: '2.55rem' },
                fontWeight: 950,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              Find chargeable weight
            </Typography>
            <Typography
              sx={{
                color: '#4B5870',
                mt: 1.4,
                mb: 2.5,
                fontSize: '0.94rem',
                lineHeight: 1.7,
              }}
            >
              Enter parcel dimensions in centimeters and actual weight in kilograms.
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Length"
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  fullWidth
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Breadth"
                  type="number"
                  value={breadth}
                  onChange={(e) => setBreadth(e.target.value)}
                  fullWidth
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  fullWidth
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Actual Weight (kg)"
                  type="number"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  fullWidth
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label="Volumetric Divisor"
                  value={divisor}
                  onChange={(e) => setDivisor(e.target.value)}
                  fullWidth
                  sx={fieldSx}
                >
                  <MenuItem value="5000">5000 - Standard air</MenuItem>
                  <MenuItem value="4000">4000 - Dense courier slab</MenuItem>
                  <MenuItem value="27000">27000 - B2B CFT</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 2.6,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 1.4,
              }}
            >
              {resultCards.map((card) => (
                <Box
                  key={card.label}
                  sx={{
                    border: `1px solid ${alpha('#07142F', 0.1)}`,
                    borderRadius: 3,
                    p: 1.7,
                    bgcolor: '#FFFFFF',
                  }}
                >
                  <Box
                    sx={{
                      color: card.color,
                      bgcolor: card.bg,
                      width: 38,
                      height: 38,
                      borderRadius: 2.4,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 21,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography
                    sx={{
                      mt: 1.4,
                      color: '#64748B',
                      fontSize: '0.74rem',
                      fontWeight: 850,
                    }}
                  >
                    {card.label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.4,
                      color: '#07142F',
                      fontSize: '1.38rem',
                      fontWeight: 950,
                    }}
                  >
                    {card.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                mt: 2.4,
                borderRadius: 3,
                border: `1px solid ${alpha(teal, 0.12)}`,
                background: `linear-gradient(135deg, ${alpha(teal, 0.06)}, ${alpha(orange, 0.055)})`,
                p: 1.8,
              }}
            >
              <Typography sx={{ color: '#07142F', fontWeight: 950 }}>Billing slab: {calculation.source}</Typography>
              <Typography
                sx={{
                  mt: 0.45,
                  color: muted,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                Package volume is {calculation.volume.toLocaleString('en-IN')} cubic cm. Courier billing usually uses
                the higher of actual and volumetric weight.
              </Typography>
            </Box>
          </CardContent>
        </Box>

        <Box
          component="section"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
            gap: { xs: 2.5, md: 5 },
            alignItems: 'center',
            py: { xs: 3, md: 5 },
            borderTop: `1px solid ${alpha(teal, 0.1)}`,
            borderBottom: `1px solid ${alpha(teal, 0.1)}`,
          }}
        >
          <Box>
            <Typography
              sx={{
                color: orange,
                fontSize: '0.76rem',
                fontWeight: 900,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Volumetric formula
            </Typography>
            <Typography
              component="h2"
              sx={{
                mt: 1.2,
                color: '#07142F',
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 950,
                lineHeight: 1.05,
              }}
            >
              Dimensions can weigh more than kilograms.
            </Typography>
            <Typography sx={{ mt: 1.5, color: muted, lineHeight: 1.75, fontWeight: 650 }}>
              Couriers reserve vehicle space by volume. That is why a light but large parcel can have a higher billable
              weight than its actual scale reading.
            </Typography>
          </Box>
          <Box
            sx={{
              borderRadius: 1,
              border: `1px solid ${alpha(teal, 0.12)}`,
              bgcolor: '#FFFFFF',
              px: { xs: 2.5, md: 4 },
              py: { xs: 3, md: 4 },
              boxShadow: '0 18px 44px rgba(7,20,47,0.06)',
            }}
          >
            <Typography sx={{ color: muted, fontSize: '0.78rem', fontWeight: 850 }}>
              STANDARD COURIER FORMULA
            </Typography>
            <Typography
              sx={{
                mt: 1.4,
                color: teal,
                fontSize: { xs: '1.25rem', md: '1.8rem' },
                fontWeight: 950,
              }}
            >
              Length x Breadth x Height / {divisor}
            </Typography>
            <Box sx={{ mt: 2.2, height: 1, bgcolor: alpha(teal, 0.12) }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mt: 2.2 }}>
              <Box>
                <Typography sx={{ color: muted, fontSize: '0.75rem', fontWeight: 800 }}>Calculated volume</Typography>
                <Typography
                  sx={{
                    mt: 0.4,
                    color: '#07142F',
                    fontSize: '1.3rem',
                    fontWeight: 950,
                  }}
                >
                  {calculation.volume.toLocaleString('en-IN')} cm3
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: muted, fontSize: '0.75rem', fontWeight: 800 }}>Billable result</Typography>
                <Typography
                  sx={{
                    mt: 0.4,
                    color: orange,
                    fontSize: '1.3rem',
                    fontWeight: 950,
                  }}
                >
                  {calculation.chargeable.toFixed(2)} kg
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>

        <PublicToolStorySections
          eyebrow="How weight calculation works"
          title="From parcel size to the right billing slab"
          description="A clear three-step workflow helps you enter dimensions correctly and understand which weight the courier will use."
          steps={[
            {
              icon: <TbRulerMeasure />,
              title: 'Measure the parcel',
              description: 'Use the outermost length, breadth and height after final packaging.',
            },
            {
              icon: <TbScale />,
              title: 'Add actual weight',
              description: 'Place the packed shipment on a scale and enter the kilogram reading.',
            },
            {
              icon: <FiCheckCircle />,
              title: 'Use the higher value',
              description: 'The calculator compares actual and volumetric weight automatically.',
            },
          ]}
          features={[
            {
              icon: <FiPackage />,
              title: 'Accurate slabs',
              description: 'Reduce avoidable weight adjustments.',
            },
            {
              icon: <FiDollarSign />,
              title: 'Better estimates',
              description: 'Know the likely billing basis early.',
            },
            {
              icon: <FiShield />,
              title: 'Fewer disputes',
              description: 'Declare parcel details with confidence.',
            },
            {
              icon: <FiZap />,
              title: 'Instant result',
              description: 'See chargeable weight as you type.',
            },
          ]}
          ctaTitle="Weight checked. Ready to compare rates?"
          ctaDescription="Move straight to the rate calculator with your parcel dimensions ready, or sign in to book and manage shipments."
          primaryLabel="Compare courier rates"
          primaryPath="/rate-calculator"
          secondaryLabel="Login to ship"
          secondaryPath="/login"
        />
      </Stack>
    </Box>
  )
}
