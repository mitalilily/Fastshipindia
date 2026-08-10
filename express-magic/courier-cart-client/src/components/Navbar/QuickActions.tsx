import { alpha, Box, ButtonBase, Popover, Tooltip, Typography, useTheme } from '@mui/material'
import { useState, type MouseEvent } from 'react'
import { AiTwotoneThunderbolt } from 'react-icons/ai'
import { useNavigate } from 'react-router-dom'
import addWarehouseImage from '../../assets/quick-actions/add-warehouse.png'
import bookOrderImage from '../../assets/quick-actions/book-order.png'
import earlyCodImage from '../../assets/quick-actions/early-cod.png'
import rateCalculatorImage from '../../assets/quick-actions/rate-calculator.png'
import rechargeWalletImage from '../../assets/quick-actions/recharge-wallet.png'
import transporterIdImage from '../../assets/quick-actions/transporter-id.png'
import { useAuth } from '../../context/auth/AuthContext'
import { useMerchantReadiness } from '../../hooks/useMerchantReadiness'
import AddMoneyDialog from '../AddMoneyDialog'

type QuickAction = {
  name: string
  image: string
  path?: string
  action?: 'recharge'
  requiresMerchantReady?: boolean
}

const actions: QuickAction[] = [
  {
    name: 'Rate Calculator',
    image: rateCalculatorImage,
    path: '/tools/rate_calculator',
  },
  {
    name: 'Add Warehouse',
    image: addWarehouseImage,
    path: '/settings/manage_pickups',
  },
  {
    name: 'Recharge Wallet',
    image: rechargeWalletImage,
    action: 'recharge',
  },
  {
    name: 'Early COD',
    image: earlyCodImage,
    path: '/cod-remittance',
  },
  {
    name: 'Book Order',
    image: bookOrderImage,
    path: '/orders/create',
    requiresMerchantReady: true,
  },
  {
    name: 'Transporter ID',
    image: transporterIdImage,
    path: '/couriers/partners',
  },
]

export default function QuickActions() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { walletBalance } = useAuth()
  const { isReady, firstIncompleteStep } = useMerchantReadiness()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [walletOpen, setWalletOpen] = useState(false)
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

    if (action.action === 'recharge') {
      setWalletOpen(true)
      return
    }

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
              borderRadius: 2,
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
                minHeight: { xs: 126, md: 108 },
                px: 1,
                py: 1.2,
                borderRadius: 1.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 0.65,
                color: ink,
                transition: 'background-color 160ms ease, transform 160ms ease',
                '&:hover': {
                  bgcolor: alpha(accent, isDark ? 0.11 : 0.07),
                  transform: 'translateY(-2px)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${accent}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Box
                component="img"
                src={action.image}
                alt=""
                aria-hidden="true"
                sx={{
                  display: 'block',
                  width: { xs: 72, md: 60 },
                  height: { xs: 72, md: 60 },
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  width: '100%',
                  color: ink,
                  fontSize: '0.83rem',
                  lineHeight: 1.2,
                  fontWeight: 600,
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

      <AddMoneyDialog
        currentBalance={walletBalance ?? 0}
        open={walletOpen}
        setOpen={setWalletOpen}
      />
    </>
  )
}
