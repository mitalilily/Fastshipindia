import { alpha, Box, Button, Grid, Stack, Typography } from '@mui/material'
import { MdOutlineFactCheck, MdVerifiedUser } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth/AuthContext'

const DE_BLUE = '#0C3B80'
const DE_AMBER = '#F57C00'
const TEXT_PRIMARY = '#241A1B'
const TEXT_SECONDARY = '#6A5E59'

const cardSx = {
  borderRadius: 4,
  p: { xs: 2, md: 2.3 },
  border: `1px solid ${alpha(DE_BLUE, 0.08)}`,
  bgcolor: '#fffdf8',
  boxShadow: `0 12px 26px ${alpha(TEXT_PRIMARY, 0.05)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: `0 16px 34px ${alpha(TEXT_PRIMARY, 0.08)}`,
    borderColor: alpha(DE_BLUE, 0.15),
  },
}

const GettingStarted = () => {
  const { walletBalance, user } = useAuth()
  const navigate = useNavigate()

  const isKycDone = user?.domesticKyc?.status === 'verified'

  return (
    <Stack gap={2.2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, color: TEXT_PRIMARY }}>
          Panel Essentials
        </Typography>
        <Typography sx={{ fontSize: '12px', color: TEXT_SECONDARY, fontWeight: 700 }}>
          Billing and verification essentials
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={cardSx}>
            <Stack spacing={1.2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontWeight: 800, color: TEXT_PRIMARY, fontSize: '0.9rem' }}>
                  Billing Wallet
                </Typography>
                <MdOutlineFactCheck size={20} color={DE_BLUE} />
              </Stack>

              <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: DE_BLUE, letterSpacing: -0.5 }}>
                INR {(walletBalance ?? 0).toLocaleString('en-IN')}
              </Typography>

              <Typography sx={{ fontSize: '0.86rem', color: TEXT_SECONDARY, fontWeight: 500 }}>
                Keep wallet funded to avoid booking interruptions and recharge friction.
              </Typography>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/billing/passbook')}
                  sx={{
                    bgcolor: DE_BLUE,
                    '&:hover': { bgcolor: '#082A57' },
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 800,
                    fontSize: '12px',
                    px: 2,
                  }}
                >
                  Open Wallet
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={cardSx}>
            <Stack spacing={1.2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontWeight: 800, color: TEXT_PRIMARY, fontSize: '0.9rem' }}>
                  KYC Details (Optional)
                </Typography>
                <MdVerifiedUser size={20} color={isKycDone ? '#178A68' : DE_AMBER} />
              </Stack>

              <Typography sx={{ fontSize: '0.88rem', color: TEXT_SECONDARY, fontWeight: 500 }}>
                {isKycDone
                  ? 'Your optional KYC verification is complete.'
                  : 'Add verification details whenever convenient; shipping is not blocked.'}
              </Typography>

              <Typography sx={{ fontSize: '11px', color: TEXT_SECONDARY, fontWeight: 700 }}>
                Status: {isKycDone ? 'Verified' : 'Not submitted (Optional)'}
              </Typography>
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default GettingStarted
