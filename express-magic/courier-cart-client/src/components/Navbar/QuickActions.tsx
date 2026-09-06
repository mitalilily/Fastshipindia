import {
  alpha,
  Box,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Popover,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { AiTwotoneThunderbolt } from 'react-icons/ai'
import {
  TbBuildingBank,
  TbBuildingWarehouse,
  TbCalculator,
  TbId,
  TbPackageExport,
  TbWallet,
  TbX,
} from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { getCarrierTransportIds, type CarrierTransportId } from '../../api/courier'
import { useMerchantReadiness } from '../../hooks/useMerchantReadiness'

type QuickAction = {
  name: string
  icon: ReactNode
  accent: string
  path?: string
  action?: 'transportIds'
  requiresMerchantReady?: boolean
}

const fallbackCarrierTransportIds: CarrierTransportId[] = [
  { carrierKey: 'delhivery', carrierName: 'Delhivery', transportId: '06AAPCS9575E1ZR', isActive: true, sortOrder: 10 },
  { carrierKey: 'movin', carrierName: 'Movin', transportId: '88AAFC17460Q1ZW', isActive: true, sortOrder: 20 },
  { carrierKey: 'bluedart', carrierName: 'Bluedart', transportId: '27AAACB044L1ZS', isActive: true, sortOrder: 30 },
  { carrierKey: 'xpressbees', carrierName: 'Xpressbees', transportId: '27AAGCB3904P2ZC', isActive: true, sortOrder: 40 },
  { carrierKey: 'dtdc', carrierName: 'DTDC', transportId: '88AAACD8017H1ZX', isActive: true, sortOrder: 50 },
  { carrierKey: 'dp-world', carrierName: 'DP World', transportId: '88AADCD1983D1ZS', isActive: true, sortOrder: 60 },
  { carrierKey: 'ekart-ltl', carrierName: 'Ekart LTL', transportId: '07AADCI8374D2ZH', isActive: true, sortOrder: 70 },
  { carrierKey: 'tci-express', carrierName: 'TCI Express', transportId: '06AADCT0663J4Z9', isActive: true, sortOrder: 80 },
  { carrierKey: 'gati', carrierName: 'Gati', transportId: '88AACCA2894D1ZS', isActive: true, sortOrder: 90 },
]

const actions: QuickAction[] = [
  {
    name: 'Rate Calculator',
    icon: <TbCalculator />,
    accent: '#0D3B8E',
    path: '/tools/rate_calculator',
  },
  {
    name: 'Add Warehouse',
    icon: <TbBuildingWarehouse />,
    accent: '#C81E2B',
    path: '/settings/manage_pickups',
  },
  {
    name: 'Recharge Wallet',
    icon: <TbWallet />,
    accent: '#103B5F',
    path: '/billing/passbook?recharge=true',
  },
  {
    name: 'Early COD',
    icon: <TbBuildingBank />,
    accent: '#44616C',
    path: '/billing/cod-remittance',
  },
  {
    name: 'Book Order',
    icon: <TbPackageExport />,
    accent: '#1D2842',
    path: '/orders/create',
    requiresMerchantReady: true,
  },
  {
    name: 'Transporter ID',
    icon: <TbId />,
    accent: '#6B7280',
    action: 'transportIds',
  },
]

export default function QuickActions() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { isReady, firstIncompleteStep } = useMerchantReadiness()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [transportDialogOpen, setTransportDialogOpen] = useState(false)
  const [transportIds, setTransportIds] = useState<CarrierTransportId[]>([])
  const [transportIdsLoading, setTransportIdsLoading] = useState(false)
  const [transportIdsError, setTransportIdsError] = useState('')
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

    if (action.action === 'transportIds') {
      setTransportDialogOpen(true)
      void loadTransportIds()
      return
    }

    if (!action.path) return

    if (action.requiresMerchantReady && !isReady) {
      navigate(firstIncompleteStep?.path || '/home')
      return
    }

    navigate(action.path)
  }

  const loadTransportIds = async () => {
    setTransportIdsLoading(true)
    setTransportIdsError('')
    try {
      const entries = await getCarrierTransportIds()
      setTransportIds(
        entries
          .filter((entry) => entry.isActive !== false)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.carrierName.localeCompare(b.carrierName)),
      )
    } catch {
      setTransportIds(fallbackCarrierTransportIds)
      setTransportIdsError('Latest Transport IDs could not be loaded. Showing saved defaults.')
    } finally {
      setTransportIdsLoading(false)
    }
  }

  const visibleTransportIds = transportIds.length > 0 ? transportIds : fallbackCarrierTransportIds

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
              border: `1px solid ${isDark ? border : alpha('#0D3B8E', 0.16)}`,
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
            borderTop: `3px solid ${accent}`,
            bgcolor: surface,
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
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 0.8,
                color: ink,
                border: `1px solid ${isDark ? alpha('#FFFFFF', 0.1) : alpha('#0D3B8E', 0.12)}`,
                bgcolor: isDark ? alpha('#FFFFFF', 0.035) : '#FFFFFF',
                transition:
                  'background-color 160ms ease, border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  bgcolor: action.accent,
                  opacity: 0.9,
                },
                '&:hover': {
                  bgcolor: alpha(action.accent, isDark ? 0.13 : 0.045),
                  borderColor: alpha(action.accent, isDark ? 0.42 : 0.24),
                  boxShadow: isDark ? 'none' : `0 12px 26px ${alpha('#0D1B4D', 0.08)}`,
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
                  bgcolor: isDark ? alpha(action.accent, 0.12) : alpha(action.accent, 0.075),
                  border: `1px solid ${alpha(action.accent, isDark ? 0.28 : 0.16)}`,
                  boxShadow: 'none',
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

      <Dialog
        open={transportDialogOpen}
        onClose={() => setTransportDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            bgcolor: surface,
            color: ink,
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? '0 24px 54px rgba(0,0,0,0.42)'
              : '0 22px 48px rgba(15,23,42,0.18)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 2.4 },
            py: 1.6,
            pr: 6,
            borderTop: `3px solid ${accent}`,
            borderBottom: `1px solid ${border}`,
            fontSize: '1rem',
            fontWeight: 800,
          }}
        >
          Transporter ID
          <IconButton
            aria-label="Close Transporter ID list"
            onClick={() => setTransportDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 10,
              top: 9,
              color: muted,
              '&:hover': {
                color: accent,
                bgcolor: alpha(accent, isDark ? 0.16 : 0.08),
              },
            }}
          >
            <TbX />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 2 }, py: 1.6 }}>
          {transportIdsLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 0.85 }}>
              {transportIdsError && (
                <Typography sx={{ color: '#B45309', fontSize: '0.78rem', fontWeight: 600, mb: 0.3 }}>
                  {transportIdsError}
                </Typography>
              )}

              {visibleTransportIds.map((entry) => (
                <Box
                  key={entry.carrierKey || entry.carrierName}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(150px, 0.75fr) 1fr' },
                    gap: { xs: 0.4, sm: 1.2 },
                    alignItems: 'center',
                    px: { xs: 1.2, sm: 1.4 },
                    py: 1,
                    borderRadius: '8px',
                    border: `1px solid ${isDark ? alpha('#FFFFFF', 0.1) : alpha('#0D3B8E', 0.1)}`,
                    bgcolor: isDark ? alpha('#FFFFFF', 0.035) : '#fbfcfe',
                  }}
                >
                  <Typography sx={{ color: ink, fontSize: '0.88rem', fontWeight: 800 }}>
                    {entry.carrierName}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#0D3B8E',
                      fontFamily: 'monospace',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      letterSpacing: 0,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {entry.transportId || '-'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

    </>
  )
}
