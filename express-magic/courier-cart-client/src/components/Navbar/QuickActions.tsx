import { alpha, Box, ButtonBase, Popover, Tooltip, Typography, useTheme } from '@mui/material'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { AiTwotoneThunderbolt } from 'react-icons/ai'
import {
  TbBuildingBank,
  TbBuildingWarehouse,
  TbCalculator,
  TbId,
  TbPackageExport,
  TbWallet,
} from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useMerchantReadiness } from '../../hooks/useMerchantReadiness'

type QuickAction = {
  name: string
  icon: ReactNode
  accent: string
  tint: string
  path?: string
  requiresMerchantReady?: boolean
}

const actions: QuickAction[] = [
  {
    name: 'Rate Calculator',
    icon: <TbCalculator />,
    accent: '#0D3B8E',
    tint: '#EAF1FF',
    path: '/tools/rate_calculator',
  },
  {
    name: 'Add Warehouse',
    icon: <TbBuildingWarehouse />,
    accent: '#0F766E',
    tint: '#E7F7F4',
    path: '/settings/manage_pickups',
  },
  {
    name: 'Recharge Wallet',
    icon: <TbWallet />,
    accent: '#B45309',
    tint: '#FFF4DE',
    path: '/billing/wallet_transactions?recharge=true',
  },
  {
    name: 'Early COD',
    icon: <TbBuildingBank />,
    accent: '#BE123C',
    tint: '#FFF0F3',
    path: '/cod-remittance',
  },
  {
    name: 'Book Order',
    icon: <TbPackageExport />,
    accent: '#1D2842',
    tint: '#EEF2F8',
    path: '/orders/create',
    requiresMerchantReady: true,
  },
  {
    name: 'Transporter ID',
    icon: <TbId />,
    accent: '#7C3AED',
    tint: '#F1ECFF',
    path: '/couriers/partners',
  },
]

export default function QuickActions() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { isReady, firstIncompleteStep } = useMerchantReadiness()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const isDark = theme.palette.mode === 'dark'
  const ink = isDark ? '#f8fafc' : '#172033'
  const muted = isDark ? '#9aa9bd' : '#66758d'
  const surface = isDark ? '#151b23' : '#ffffff'
  const itemSurface = isDark ? '#101720' : '#fbfcfe'
  const border = isDark ? '#2a313a' : alpha('#172033', 0.1)
  const accent = '#E31B23'

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleAction = (action: QuickAction) => {
    setAnchorEl(null)

    if (!action.path) return

    if (action.requiresMerchantReady && !isReady) {
      navigate(firstIncompleteStep?.path || '/home')
      return
    }

    navigate(action.path)
  }

  return (
    <>
      <Tooltip title="Quick actions" arrow>
        <ButtonBase
          aria-label="Open quick actions"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={handleOpen}
          sx={{
            height: { xs: 40, md: 36 },
            minWidth: { xs: 40, md: 36 },
            px: { xs: 0, lg: 1.25 },
            borderRadius: 2,
            border: `1px solid ${open ? alpha(accent, 0.55) : border}`,
            bgcolor: open ? alpha(accent, isDark ? 0.16 : 0.1) : itemSurface,
            color: open ? accent : muted,
            transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
            '&:hover': {
              bgcolor: alpha(accent, isDark ? 0.16 : 0.09),
              borderColor: alpha(accent, 0.48),
              color: accent,
            },
          }}
        >
          <AiTwotoneThunderbolt size={18} />
          <Typography
            component="span"
            sx={{
              display: { xs: 'none', lg: 'inline' },
              ml: 0.75,
              color: 'inherit',
              fontSize: '0.86rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Quick Actions
          </Typography>
        </ButtonBase>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: 1.15,
              width: { xs: 'calc(100vw - 24px)', sm: 600, md: 700 },
              maxWidth: 'calc(100vw - 24px)',
              borderRadius: '10px',
              border: `1px solid ${border}`,
              bgcolor: surface,
              color: ink,
              boxShadow: isDark
                ? '0 24px 54px rgba(0,0,0,0.38)'
                : '0 22px 48px rgba(15,23,42,0.16)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1.25,
            borderBottom: `1px solid ${border}`,
            background: isDark
              ? 'linear-gradient(90deg, rgba(227,27,35,0.14), rgba(13,59,142,0.08))'
              : 'linear-gradient(90deg, rgba(227,27,35,0.06), rgba(13,59,142,0.05))',
          }}
        >
          <Typography sx={{ color: ink, fontWeight: 700, fontSize: '0.95rem' }}>
            Quick Actions
          </Typography>
        </Box>

        <Box
          role="menu"
          aria-label="Quick actions"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(6, minmax(0, 1fr))',
            },
            gap: 0,
            p: { xs: 1, sm: 1.25 },
          }}
        >
          {actions.map((action) => (
            <ButtonBase
              role="menuitem"
              key={action.name}
              onClick={() => handleAction(action)}
              sx={{
                minWidth: 0,
                minHeight: { xs: 116, md: 106 },
                px: 1.1,
                py: 1.15,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 0.8,
                color: ink,
                border: `1px solid ${isDark ? alpha(action.accent, 0.3) : alpha(action.accent, 0.14)}`,
                bgcolor: isDark ? alpha(action.accent, 0.1) : action.tint,
                transition: 'background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
                '&:hover': {
                  bgcolor: alpha(action.accent, isDark ? 0.18 : 0.12),
                  borderColor: alpha(action.accent, 0.34),
                  transform: 'translateY(-2px)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${action.accent}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: '10px',
                  display: 'grid',
                  placeItems: 'center',
                  color: action.accent,
                  bgcolor: isDark ? alpha('#FFFFFF', 0.06) : alpha('#FFFFFF', 0.72),
                  border: `1px solid ${alpha(action.accent, isDark ? 0.28 : 0.18)}`,
                  boxShadow: isDark
                    ? 'none'
                    : `0 10px 22px ${alpha(action.accent, 0.1)}`,
                  '& svg': {
                    width: 27,
                    height: 27,
                    strokeWidth: 1.9,
                  },
                }}
              >
                {action.icon}
              </Box>
              <Typography
                aria-hidden="true"
                sx={{
                  width: '100%',
                  color: ink,
                  fontSize: '0.82rem',
                  lineHeight: 1.18,
                  fontWeight: 700,
                  textAlign: 'center',
                  whiteSpace: 'normal',
                }}
              >
                {action.name}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      </Popover>

    </>
  )
}
