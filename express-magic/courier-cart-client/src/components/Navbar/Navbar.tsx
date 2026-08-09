import {
  alpha,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useState, type ReactNode } from 'react'
import {
  MdAddCircle,
  MdCalculate,
  MdClose,
  MdKeyboardArrowDown,
  MdLocalShipping,
  MdMenu,
  MdNotificationsNone,
  MdOpenInNew,
  MdPlaylistAdd,
  MdRefresh,
  MdRoute,
  MdViewModule,
} from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { useAuth } from '../../context/auth/AuthContext'
import UserMenu from './UserMenu'

interface NavbarProps {
  handleDrawerToggle: () => void
  pinned?: boolean
  onPinChange?: (pinned: boolean) => void
}

const BRAND_SURFACE = BRAND.colors.paper
const BRAND_TEXT = BRAND.colors.ink
const BRAND_PRIMARY = BRAND.colors.teal
const SHIPMOZO_BLUE = '#0789ad'
const SHIPMOZO_NAVY = '#313456'

const searchOptions = [
  { label: 'AWB ID', placeholder: 'Search Order by AWB ID', compactPlaceholder: 'Search AWB', queryKey: 'awb', path: '/tools/track-order' },
  { label: 'Order ID', placeholder: 'Search by Order ID', compactPlaceholder: 'Order ID', queryKey: 'orderId', path: '/orders/new' },
  { label: 'Ref. ID', placeholder: 'Search by Reference ID', compactPlaceholder: 'Ref. ID', queryKey: 'referenceId', path: '/orders/new' },
  { label: 'Mobile No.', placeholder: 'Search by Mobile No.', compactPlaceholder: 'Mobile', queryKey: 'mobile', path: '/other/customers' },
  { label: 'Email', placeholder: 'Search by Email', compactPlaceholder: 'Email', queryKey: 'email', path: '/other/customers' },
  { label: 'Name', placeholder: 'Search by Name', compactPlaceholder: 'Name', queryKey: 'name', path: '/other/customers' },
]

export default function Navbar({ handleDrawerToggle, pinned = false, onPinChange }: NavbarProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isCompactNavbar = useMediaQuery(theme.breakpoints.down('lg'))
  const navigate = useNavigate()
  const { walletBalance } = useAuth()
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [quickAnchor, setQuickAnchor] = useState<HTMLElement | null>(null)
  const [updatesAnchor, setUpdatesAnchor] = useState<HTMLElement | null>(null)
  const [searchAnchor, setSearchAnchor] = useState<HTMLElement | null>(null)
  const [searchType, setSearchType] = useState(searchOptions[0])
  const [searchValue, setSearchValue] = useState('')
  const handlePinToggle = () => {
    onPinChange?.(!pinned)
  }
  const closeQuickActions = () => setQuickAnchor(null)
  const closeUpdates = () => setUpdatesAnchor(null)
  const closeSearchMenu = () => setSearchAnchor(null)

  const runSearch = () => {
    const value = searchValue.trim()
    if (!value) return
    const params = new URLSearchParams({ [searchType.queryKey]: value, searchBy: searchType.label })
    navigate(`${searchType.path}?${params.toString()}`)
  }

  const goTo = (path: string) => {
    closeQuickActions()
    navigate(path)
  }

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: (currentTheme) => currentTheme.zIndex.appBar }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={{ xs: 0.5, sm: 0.6, md: 0.8, lg: 1.0 }}
        sx={{
          px: { xs: 1, sm: 1.2, md: 1.6, lg: 2 },
          py: 0,
          borderRadius: 0,
          background: BRAND_SURFACE,
          borderBottom: `1px solid ${alpha(BRAND_PRIMARY, 0.1)}`,
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.08)',
          minHeight: { xs: 56, md: 68 },
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Stack
          direction="row"
          spacing={{ xs: 0.6, sm: 0.8, md: 1.0, lg: 1.2 }}
          alignItems="center"
          minWidth={0}
          flex="1 1 auto"
        >
          {isMobile && (
            <IconButton
              onClick={handleDrawerToggle}
              title="Open navigation menu"
              aria-label="Open navigation menu"
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'transparent',
                color: BRAND_TEXT,
                padding: 0,
                '&:hover': {
                  bgcolor: alpha(SHIPMOZO_BLUE, 0.08),
                  color: SHIPMOZO_BLUE,
                },
              }}
            >
              <MdMenu size={21} />
            </IconButton>
          )}

          {!isMobile && (
            <Tooltip title={pinned ? 'Collapse sidebar' : 'Expand sidebar'} placement="bottom">
              <IconButton
                onClick={handlePinToggle}
                size="small"
                sx={{
                  width: 32,
                  height: 32,
                  color: BRAND_TEXT,
                  transition: 'all 200ms ease',
                  padding: 0,
                  '&:hover': {
                    color: SHIPMOZO_BLUE,
                    background: alpha(SHIPMOZO_BLUE, 0.08),
                  },
                }}
              >
                <MdMenu size={24} />
              </IconButton>
            </Tooltip>
          )}

          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault()
              runSearch()
            }}
            sx={{
              display: { xs: 'none', sm: 'flex' },
              height: 50,
              width: { sm: 280, md: 330, lg: 420 },
              maxWidth: '38vw',
              border: '1px solid #d5dce6',
              borderRadius: '25px',
              overflow: 'hidden',
              bgcolor: '#fff',
              ml: { md: 1.5, lg: 3 },
            }}
          >
            <Button
              onClick={(event) => setSearchAnchor(event.currentTarget)}
              sx={{
                width: 106,
                bgcolor: '#eef3f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.8,
                color: '#334155',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0,
                borderRadius: 0,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#e7eef6' },
              }}
            >
              {searchType.label} <MdKeyboardArrowDown size={18} />
            </Button>
            <Box
              component="input"
              value={searchValue}
              placeholder={isCompactNavbar ? searchType.compactPlaceholder : searchType.placeholder}
              onChange={(event) => setSearchValue(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSearchValue('')
              }}
              sx={{
                flex: 1,
                border: 0,
                outline: 0,
                px: 1.4,
                color: BRAND_TEXT,
                fontSize: 14,
                bgcolor: '#fff',
              }}
            />
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={{ xs: 0.4, sm: 0.5, md: 0.7, lg: 0.85 }}
          alignItems="center"
          justifyContent="flex-end"
          flexShrink={0}
          sx={{ minWidth: 0, overflow: 'visible' }}
        >
          <Typography
            sx={{
              display: { xs: 'none', xl: 'block' },
              color: SHIPMOZO_BLUE,
              fontSize: 14,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            Notification Credits: 0
          </Typography>
          <Box sx={{ display: { xs: 'none', xl: 'block' }, width: 1, height: 24, bgcolor: '#d8e2ec', flexShrink: 0 }} />
          <IconButton sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: '#667085' }}>
            <MdRefresh size={22} />
          </IconButton>
          <Stack direction="row" sx={{ display: { xs: 'none', md: 'flex' }, border: `1px solid ${SHIPMOZO_BLUE}`, borderRadius: '11px', overflow: 'hidden', height: 40, width: 184, flexShrink: 0 }}>
            <Button
              onClick={() => setRechargeOpen(true)}
              sx={{ px: 0.9, color: SHIPMOZO_BLUE, textTransform: 'none', fontWeight: 900, minWidth: 92, width: 92, whiteSpace: 'nowrap' }}
            >
              {'\u20B9 '}
              {Number(walletBalance ?? 269.75).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Button>
            <Button onClick={() => setRechargeOpen(true)} sx={{ px: 0, bgcolor: SHIPMOZO_BLUE, color: '#fff', borderRadius: 0, textTransform: 'none', fontWeight: 900, minWidth: 92, width: 92, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#06799a' } }}>
              Recharge
            </Button>
          </Stack>
          <Button
            onClick={(event) => setQuickAnchor(event.currentTarget)}
            endIcon={<MdKeyboardArrowDown size={18} />}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, ...navButtonSx, minWidth: 150, bgcolor: SHIPMOZO_BLUE }}
          >
            Quick Actions
          </Button>
          <Button onClick={() => navigate('/tickets')} sx={{ display: { xs: 'none', lg: 'inline-flex' }, ...navButtonSx, minWidth: 88, bgcolor: SHIPMOZO_NAVY }}>
            Tickets
          </Button>
          <Badge badgeContent={4} color="error" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            <IconButton onClick={(event) => setUpdatesAnchor(event.currentTarget)} sx={{ color: BRAND_TEXT }}>
              <MdNotificationsNone size={26} />
            </IconButton>
          </Badge>
          <Button
            startIcon={<MdAddCircle size={18} />}
            onClick={() => navigate('/orders/new')}
            sx={{ display: { xs: 'none', xl: 'inline-flex' }, ...navButtonSx, bgcolor: SHIPMOZO_BLUE }}
          >
            Add Order
          </Button>
          <UserMenu />
        </Stack>
      </Stack>

      <Popover
        open={Boolean(searchAnchor)}
        anchorEl={searchAnchor}
        onClose={closeSearchMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.8,
              width: 110,
              borderRadius: '0 0 12px 12px',
              border: '1px solid #dfe6ee',
              boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Stack sx={{ py: 0.5 }}>
          {searchOptions.map((option) => (
            <Button
              key={option.label}
              onClick={() => {
                setSearchType(option)
                setSearchValue('')
                closeSearchMenu()
              }}
              sx={{
                justifyContent: 'flex-start',
                height: 44,
                px: 2,
                borderRadius: 0,
                bgcolor: option.label === searchType.label ? '#eef7fb' : '#fff',
                color: '#334155',
                fontSize: 14,
                textTransform: 'none',
                '&:hover': { bgcolor: '#f4f8fb' },
              }}
            >
              {option.label}
            </Button>
          ))}
        </Stack>
      </Popover>
      <QuickActionsPopover anchorEl={quickAnchor} onClose={closeQuickActions} onNavigate={goTo} />
      <UpdatesPopover anchorEl={updatesAnchor} onClose={closeUpdates} />
      <RechargeWalletDialog
        open={rechargeOpen}
        amount={rechargeAmount}
        promoCode={promoCode}
        onAmountChange={setRechargeAmount}
        onPromoCodeChange={setPromoCode}
        onClose={() => setRechargeOpen(false)}
      />
    </Box>
  )
}

const navButtonSx = {
  height: 40,
  px: 1.7,
  flexShrink: 0,
  borderRadius: '11px',
  color: '#fff',
  textTransform: 'none',
  fontWeight: 900,
  whiteSpace: 'nowrap',
  '&:hover': {
    bgcolor: '#06799a',
  },
}

interface QuickActionsPopoverProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  onNavigate: (path: string) => void
}

const quickActions = [
  {
    title: 'Rate Calculator',
    subtitle: 'Calculate your shipping rate',
    icon: <MdCalculate size={25} />,
    color: '#ff8f78',
    path: '/tools/rate-calculator',
  },
  {
    title: 'Shipping Notification',
    subtitle: 'Configure your shipping notification',
    icon: <MdLocalShipping size={25} />,
    color: '#5d86ff',
    path: '/settings/shipping-notification',
  },
  {
    title: 'Quick Add Order',
    subtitle: 'Add a new quick order',
    icon: <MdViewModule size={25} />,
    color: '#9189ff',
    path: '/orders/create',
  },
  {
    title: 'Add Order',
    subtitle: 'Add a new order',
    icon: <MdPlaylistAdd size={25} />,
    color: '#45dbc1',
    path: '/orders/new',
  },
  {
    title: 'Track Order',
    subtitle: 'Track current status of your order',
    icon: <MdRoute size={25} />,
    color: '#22b8cf',
    path: '/tools/track-order',
  },
]

function QuickActionsPopover({ anchorEl, onClose, onNavigate }: QuickActionsPopoverProps) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: actionPopoverPaperSx } }}
    >
      <Stack spacing={1.35} sx={{ p: 2.4 }}>
        {quickActions.map((item) => (
          <ButtonBaseRow key={item.title} onClick={() => onNavigate(item.path)} icon={item.icon} color={item.color} title={item.title} subtitle={item.subtitle} />
        ))}
      </Stack>
    </Popover>
  )
}

interface ButtonBaseRowProps {
  icon: ReactNode
  color: string
  title: string
  subtitle: string
  onClick?: () => void
}

function ButtonBaseRow({ icon, color, title, subtitle, onClick }: ButtonBaseRowProps) {
  return (
    <Button
      onClick={onClick}
      fullWidth
      sx={{
        justifyContent: 'flex-start',
        gap: 1.6,
        p: 0,
        color: '#2f3747',
        textAlign: 'left',
        textTransform: 'none',
        borderRadius: '10px',
        '&:hover': { bgcolor: '#f7fafc' },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '12px',
          display: 'grid',
          placeItems: 'center',
          color,
          bgcolor: '#f2f6fb',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: '#2f3747', fontSize: 14, fontWeight: 900, lineHeight: 1.2 }}>{title}</Typography>
        <Typography sx={{ color: '#334155', fontSize: 14, fontWeight: 500, mt: 0.6, lineHeight: 1.25 }}>{subtitle}</Typography>
      </Box>
    </Button>
  )
}

function UpdatesPopover({ anchorEl, onClose }: { anchorEl: HTMLElement | null; onClose: () => void }) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { ...actionPopoverPaperSx, width: 450, maxHeight: 625 } } }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e6edf5' }}>
        <Typography sx={{ fontSize: 18, fontWeight: 900, color: '#2f3747' }}>Updates</Typography>
      </Box>
      <Stack spacing={1.2} sx={{ p: 1.6 }}>
        <Box sx={{ border: '1px solid #dfe6ee', borderRadius: '10px', p: 2.4 }}>
          <Stack direction="row" justifyContent="space-between" gap={2}>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: '#2f3747' }}>Price Alert-</Typography>
              <Typography sx={{ fontSize: 14, color: '#334155', mt: 0.7, lineHeight: 1.45 }}>
                Due to the recent diesel price hike, freight charges for a few courier partners have been revised.
              </Typography>
            </Box>
          </Stack>
          <Typography sx={{ mt: 2, textAlign: 'right', color: '#334155', fontSize: 14 }}>27 Jul 2026</Typography>
        </Box>
        <Box sx={{ border: '1px solid #dfe6ee', borderRadius: '10px', p: 2.2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 900, color: '#2f3747', mb: 1.3 }}>We've Made Things Even Better</Typography>
          <Box
            sx={{
              height: 188,
              borderRadius: '7px',
              bgcolor: '#eaf3ff',
              display: 'grid',
              placeItems: 'center',
              color: '#3b82f6',
              fontSize: 26,
              fontWeight: 900,
              textAlign: 'center',
              mb: 1.4,
            }}
          >
            We've
            <br />
            Upgraded!
          </Box>
          <Typography sx={{ fontSize: 14, color: '#334155', lineHeight: 1.45 }}>
            We're excited to announce the latest updates to Shipmozo, designed to improve your shipping and order management experience.
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
            <Button endIcon={<MdOpenInNew size={16} />} sx={{ p: 0, minWidth: 0, color: '#2563eb', textTransform: 'none', fontWeight: 800 }}>
              Open to know more
            </Button>
            <Typography sx={{ color: '#334155', fontSize: 14 }}>30 Jun 2026</Typography>
          </Stack>
        </Box>
      </Stack>
    </Popover>
  )
}

interface RechargeWalletDialogProps {
  open: boolean
  amount: string
  promoCode: string
  onAmountChange: (value: string) => void
  onPromoCodeChange: (value: string) => void
  onClose: () => void
}

function RechargeWalletDialog({ open, amount, promoCode, onAmountChange, onPromoCodeChange, onClose }: RechargeWalletDialogProps) {
  const quickAmounts = ['+1000', '+2000', '+5000', '+10000', '+20000']

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', maxWidth: 556 } }}>
      <DialogTitle sx={{ px: 3, py: 2.3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#2f3747' }}>Recharge Wallet</Typography>
          <IconButton onClick={onClose} sx={{ color: '#6b7c93' }}>
            <MdClose size={24} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px: 3, py: 2.4 }}>
        <Typography sx={{ color: '#2f3747', fontSize: 14, fontWeight: 800, mb: 1 }}>
          Amount <Box component="span" sx={{ color: '#ff6f61' }}>*</Box>
        </Typography>
        <TextField
          fullWidth
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="Enter amount"
          type="number"
          sx={fieldSx}
          InputProps={{ startAdornment: amount ? <InputAdornment position="start">{'\u20B9'}</InputAdornment> : undefined }}
        />
        <Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mt: 1 }}>
          {quickAmounts.map((item) => (
            <Button
              key={item}
              onClick={() => onAmountChange(item.replace('+', ''))}
              sx={{
                minWidth: 0,
                height: 30,
                px: 1.25,
                borderRadius: '10px',
                border: `1px solid ${SHIPMOZO_BLUE}`,
                color: SHIPMOZO_BLUE,
                bgcolor: '#fff',
                fontSize: 13,
                fontWeight: 800,
                textTransform: 'none',
              }}
            >
              {item}
            </Button>
          ))}
        </Stack>
        <Typography sx={{ color: '#2f3747', fontSize: 14, fontWeight: 800, mt: 2.2, mb: 1 }}>Promo code</Typography>
        <TextField
          fullWidth
          value={promoCode}
          onChange={(event) => onPromoCodeChange(event.target.value)}
          placeholder="Enter your code"
          sx={fieldSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button sx={{ minWidth: 80, height: 33, borderRadius: '10px', bgcolor: SHIPMOZO_BLUE, color: '#fff', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: '#06799a' } }}>
                  Apply
                </Button>
              </InputAdornment>
            ),
          }}
        />
        <Button endIcon={<MdKeyboardArrowDown size={20} />} sx={{ mt: 1.2, p: 0, minWidth: 0, color: '#2f3747', textTransform: 'none', fontWeight: 900 }}>
          View Available Promo Codes
        </Button>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.4 }}>
        <Button onClick={onClose} sx={{ height: 40, px: 2.7, borderRadius: '10px', bgcolor: SHIPMOZO_BLUE, color: '#fff', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: '#06799a' } }}>
          Recharge
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const actionPopoverPaperSx = {
  mt: 0.8,
  width: 422,
  borderRadius: '10px',
  border: '1px solid #e5ebf2',
  boxShadow: '0 20px 42px rgba(15, 23, 42, 0.12)',
  overflow: 'hidden',
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 50,
    borderRadius: '11px',
    bgcolor: '#fff',
    '& fieldset': { borderColor: '#d5dce6' },
    '&:hover fieldset': { borderColor: '#c6d0dc' },
    '&.Mui-focused fieldset': { borderColor: SHIPMOZO_BLUE, borderWidth: 1 },
  },
  '& input': { color: '#334155', fontSize: 14 },
}
