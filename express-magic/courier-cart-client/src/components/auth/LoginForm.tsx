import { alpha, Box, Stack, Typography } from '@mui/material'
import { FiBarChart2, FiCheckCircle, FiMapPin, FiShield, FiTruck } from 'react-icons/fi'
import { BRAND } from '../../config/brand'
import LogisticsThreeScene from './LogisticsThreeScene'
import PhoneForm from './PhoneForm'

const { teal, tealDark, orange, ink, text, muted, paper, surface, border } = BRAND.colors

const highlights = [
  { icon: <FiTruck />, title: 'Courier booking', copy: 'Create AWB, labels and pickup actions from one place.' },
  { icon: <FiMapPin />, title: 'Live tracking', copy: 'Follow every shipment from dispatch to doorstep.' },
  { icon: <FiBarChart2 />, title: 'Rate clarity', copy: 'Compare courier price, ETA and serviceability.' },
]

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        borderRadius: 2,
        border: `1px solid ${alpha(paper, 0.34)}`,
        background: alpha(paper, 0.12),
        px: 2,
        py: 1.65,
        color: paper,
        backdropFilter: 'blur(14px)',
      }}
    >
      <Typography sx={{ fontSize: { md: 28, lg: 32 }, fontWeight: 950, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ mt: 0.7, color: alpha(paper, 0.74), fontSize: 12.5, fontWeight: 750 }}>{label}</Typography>
    </Box>
  )
}

export default function LoginForm() {
  return (
    <Box
      sx={{
        height: { xs: 'auto', md: '100svh' },
        minHeight: { xs: '100svh', md: '100svh' },
        width: '100%',
        overflowX: 'hidden',
        overflowY: { xs: 'auto', md: 'hidden' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 1.5, sm: 2.5, md: 3, lg: 4.5 },
        py: { xs: 1.2, md: 1 },
        background:
          `linear-gradient(90deg, ${alpha(teal, 0.06)} 1px, transparent 1px) 0 0 / 52px 52px, ` +
          `linear-gradient(${alpha(teal, 0.045)} 1px, transparent 1px) 0 0 / 52px 52px, ` +
          `radial-gradient(circle at 12% 10%, ${alpha(orange, 0.1)}, transparent 30%), ` +
          `radial-gradient(circle at 86% 18%, ${alpha(teal, 0.1)}, transparent 31%), ` +
          `linear-gradient(180deg, #ffffff 0%, ${surface} 58%, #eef4fb 100%)`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1240,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(400px, 0.68fr)' },
          gap: { xs: 1.4, md: 2, lg: 2.5 },
          alignItems: 'stretch',
          maxHeight: { md: 'calc(100svh - 16px)' },
        }}
      >
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            minHeight: 'min(610px, calc(100svh - 16px))',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 3,
            border: `1px solid ${alpha(teal, 0.14)}`,
            background: tealDark,
            boxShadow: '0 28px 80px rgba(6, 26, 51, 0.18)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                `linear-gradient(90deg, ${alpha(tealDark, 0.96)} 0%, ${alpha(tealDark, 0.82)} 44%, ${alpha(tealDark, 0.24)} 100%), ` +
                "url('/assets/fastshipindia-hero-green-navy.jpg') center right / cover no-repeat",
              filter: 'saturate(0.9) contrast(1.02)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                `linear-gradient(0deg, ${alpha(tealDark, 0.84)} 0%, transparent 42%), ` +
                `radial-gradient(circle at 18% 16%, ${alpha(orange, 0.22)}, transparent 28%)`,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              zIndex: 1,
              right: { md: -54, lg: -68 },
              top: { md: 54, lg: 48 },
              width: { md: '54%', lg: '52%' },
              height: { md: '44%', lg: '46%' },
              opacity: 0.92,
              pointerEvents: 'none',
            }}
          >
            <LogisticsThreeScene compact />
          </Box>

          <Stack
            sx={{
              position: 'relative',
              zIndex: 2,
              height: '100%',
              justifyContent: 'space-between',
              p: { md: 2.4, lg: 3.2 },
              color: paper,
            }}
          >
            <Box>
              <Box
                component="img"
                src={BRAND.logo}
                alt={`${BRAND.name} logo`}
                sx={{
                  width: { md: 128, lg: 142 },
                  height: 'auto',
                  borderRadius: 1.5,
                  background: paper,
                  p: 0.75,
                  boxShadow: '0 16px 34px rgba(0,0,0,0.18)',
                }}
              />
              <Typography
                sx={{
                  mt: 2,
                  color: alpha(paper, 0.72),
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                FastShip merchant access
              </Typography>
              <Typography
                component="h1"
                sx={{
                  mt: 1.35,
                  maxWidth: 600,
                  color: paper,
                  fontSize: { md: 44, lg: 56 },
                  fontWeight: 950,
                  letterSpacing: 0,
                  lineHeight: 1.02,
                }}
              >
                Ship Faster.
                <Box component="span" sx={{ display: 'block', color: '#ff3b43' }}>
                  Deliver Smarter.
                </Box>
              </Typography>
              <Typography sx={{ mt: 1.35, maxWidth: 520, color: alpha(paper, 0.78), fontSize: 18, lineHeight: 1.55 }}>
                Login to book shipments, compare courier rates, track orders and manage delivery exceptions from one
                focused workspace.
              </Typography>
            </Box>

            <Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 1.25,
                  mb: 0.85,
                }}
              >
                <MetricCard value="29K+" label="PIN codes" />
                <MetricCard value="220+" label="Countries" />
                <MetricCard value="24/7" label="Visibility" />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  borderRadius: 2,
                  border: `1px solid ${alpha(paper, 0.24)}`,
                  background: alpha(paper, 0.1),
                  p: 0.9,
                  backdropFilter: 'blur(14px)',
                }}
              >
                {highlights.map((item) => (
                  <Box
                    key={item.title}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '38px 1fr',
                      gap: 1,
                      alignItems: 'center',
                      borderRadius: 1.5,
                      background: alpha(paper, 0.1),
                      px: 1.1,
                      py: 0.75,
                    }}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 1.2,
                        color: paper,
                        background: orange,
                        fontSize: 20,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box minWidth={0}>
                      <Typography sx={{ color: paper, fontSize: 14.5, fontWeight: 900 }}>{item.title}</Typography>
                      <Typography sx={{ mt: 0.25, color: alpha(paper, 0.68), fontSize: 12.5, lineHeight: 1.45 }}>
                        {item.copy}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: 450, md: 520 },
              maxHeight: { md: 'calc(100svh - 16px)' },
              overflow: { xs: 'visible', md: 'auto' },
              borderRadius: 3,
              border: `1px solid ${alpha(border, 0.9)}`,
              background: paper,
              boxShadow: '0 26px 70px rgba(6, 26, 51, 0.13)',
              px: { xs: 2, sm: 2.6, md: 2.7 },
              py: { xs: 1.6, sm: 1.9, md: 1.6 },
            }}
          >
            <Box sx={{ mb: { xs: 1.2, md: 1.05 }, textAlign: 'center' }}>
              <Box
                component="img"
                src={BRAND.logo}
                alt={`${BRAND.name} logo`}
                sx={{
                  display: 'block',
                  width: { xs: 126, sm: 138 },
                  height: 'auto',
                  mx: 'auto',
                  mb: 0.65,
                  objectFit: 'contain',
                }}
              />
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  mx: 'auto',
                  mb: 0.7,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 2,
                  color: paper,
                  background: `linear-gradient(135deg, ${teal} 0%, ${tealDark} 64%, ${orange} 100%)`,
                  boxShadow: `0 14px 28px ${alpha(teal, 0.18)}`,
                  fontSize: 26,
                }}
              >
                <FiShield />
              </Box>
              <Typography
                component="h2"
                sx={{
                  color: ink,
                  fontWeight: 950,
                  fontSize: { xs: 28, sm: 31 },
                  lineHeight: 1.08,
                  letterSpacing: 0,
                }}
              >
                Sign in to FastShip
              </Typography>
              <Typography
                sx={{
                  mt: 0.65,
                  color: text,
                  fontSize: { xs: 14, sm: 14.5 },
                  lineHeight: 1.5,
                  maxWidth: 370,
                  mx: 'auto',
                }}
              >
                Use OTP or password access to manage courier bookings, billing, NDR and shipment tracking.
              </Typography>
            </Box>

            <PhoneForm />

            <Box
              sx={{
                mt: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                color: muted,
                fontSize: { xs: 12, sm: 13 },
                fontWeight: 700,
                textAlign: 'center',
                flexWrap: 'wrap',
              }}
            >
              <FiCheckCircle size={16} />
              Protected access for your shipping workspace.
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
