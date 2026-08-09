import { alpha, Box, Stack, Typography } from '@mui/material'
import { FiBarChart2, FiCheckCircle, FiMapPin, FiShield, FiTruck } from 'react-icons/fi'
import { BRAND } from '../../config/brand'
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
        minHeight: '100dvh',
        width: '100%',
        overflowX: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 1.5, sm: 2.5, md: 4.5, lg: 6 },
        py: { xs: 2, md: 4.5 },
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
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(430px, 0.72fr)' },
          gap: { xs: 2.5, md: 3.5, lg: 4.5 },
          alignItems: 'stretch',
        }}
      >
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            minHeight: 690,
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

          <Stack
            sx={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              justifyContent: 'space-between',
              p: { md: 4.5, lg: 5.5 },
              color: paper,
            }}
          >
            <Box>
              <Box
                component="img"
                src={BRAND.logo}
                alt={`${BRAND.name} logo`}
                sx={{
                  width: 154,
                  height: 'auto',
                  borderRadius: 1.5,
                  background: paper,
                  p: 0.75,
                  boxShadow: '0 16px 34px rgba(0,0,0,0.18)',
                }}
              />
              <Typography
                sx={{
                  mt: 5,
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
                  mt: 2,
                  maxWidth: 600,
                  color: paper,
                  fontSize: { md: 54, lg: 66 },
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
              <Typography sx={{ mt: 2.2, maxWidth: 520, color: alpha(paper, 0.78), fontSize: 18, lineHeight: 1.7 }}>
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
                  mb: 2,
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
                  p: 1.25,
                  backdropFilter: 'blur(14px)',
                }}
              >
                {highlights.map((item) => (
                  <Box
                    key={item.title}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '42px 1fr',
                      gap: 1.25,
                      alignItems: 'center',
                      borderRadius: 1.5,
                      background: alpha(paper, 0.1),
                      px: 1.35,
                      py: 1.15,
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
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
              borderRadius: 3,
              border: `1px solid ${alpha(border, 0.9)}`,
              background: paper,
              boxShadow: '0 26px 70px rgba(6, 26, 51, 0.13)',
              px: { xs: 2, sm: 3.2, md: 3.6 },
              py: { xs: 2.4, sm: 3.4, md: 3.8 },
            }}
          >
            <Box sx={{ mb: { xs: 2, md: 2.4 }, textAlign: 'center' }}>
              <Box
                component="img"
                src={BRAND.logo}
                alt={`${BRAND.name} logo`}
                sx={{
                  display: 'block',
                  width: { xs: 150, sm: 170 },
                  height: 'auto',
                  mx: 'auto',
                  mb: 2,
                  objectFit: 'contain',
                }}
              />
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  mx: 'auto',
                  mb: 1.6,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 2,
                  color: paper,
                  background: `linear-gradient(135deg, ${teal} 0%, ${tealDark} 64%, ${orange} 100%)`,
                  boxShadow: `0 14px 28px ${alpha(teal, 0.18)}`,
                  fontSize: 28,
                }}
              >
                <FiShield />
              </Box>
              <Typography
                component="h2"
                sx={{
                  color: ink,
                  fontWeight: 950,
                  fontSize: { xs: 30, sm: 34 },
                  lineHeight: 1.08,
                  letterSpacing: 0,
                }}
              >
                Sign in to FastShip
              </Typography>
              <Typography
                sx={{
                  mt: 1.15,
                  color: text,
                  fontSize: { xs: 14.5, sm: 15.5 },
                  lineHeight: 1.6,
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
                mt: 2.2,
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
