import {
  alpha,
  Badge,
  Box,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useRef } from 'react'
import { MdDarkMode, MdLightMode, MdNotifications } from 'react-icons/md'
import { TbHeadphones, TbLayoutSidebarLeftCollapseFilled } from 'react-icons/tb'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth/AuthContext'
import { useClientThemeMode } from '../../context/theme/ClientThemeContext'
import { useClientNotifications } from '../../hooks/useClientNotifications'
import GlobalSearch from './GlobalSearch'
import QuickActions from './QuickActions'
import WalletMenu from './WalletMenu'
import UserMenu from './UserMenu'

interface NavbarProps {
  handleDrawerToggle: () => void
  pinned: boolean
  name?: string
}

const ACTIVE = '#0B3A78'
const ORANGE = '#E31B23'

const getSectionLabel = (pathname: string) =>
  (
    [
      { label: 'Home', match: '/home' },
      { label: 'Orders', match: '/orders' },
      { label: 'Dashboard', match: '/dashboard' },
      { label: 'Reports', match: '/reports' },
      { label: 'Billing', match: '/billing' },
      { label: 'Billing', match: '/cod-remittance' },
      { label: 'Reconciliation', match: '/reconciliation' },
      { label: 'Operations', match: '/ops' },
      { label: 'Tools', match: '/tools' },
      { label: 'Support', match: '/support' },
      { label: 'Notifications', match: '/notifications' },
      { label: 'Settings', match: '/settings' },
      { label: 'Channels', match: '/channels' },
      { label: 'Couriers', match: '/couriers' },
      { label: 'Profile', match: '/profile' },
    ] as const
  ).find((section) => pathname.startsWith(section.match))?.label || 'Home'

export default function Navbar({ handleDrawerToggle, pinned }: NavbarProps) {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const topBarRef = useRef<HTMLDivElement | null>(null)
  const activeSection = getSectionLabel(location.pathname)
  const { walletBalance, isAuthenticated } = useAuth()
  const { mode, setMode } = useClientThemeMode()
  const isDark = theme.palette.mode === 'dark'
  const navBg = isDark ? '#151b23' : '#ffffff'
  const panelBg = isDark ? '#101720' : '#f8fafc'
  const borderColor = isDark ? '#2a313a' : alpha('#0f172a', 0.1)
  const textColor = isDark ? '#f8fafc' : '#11182d'
  const mutedColor = isDark ? '#93a4ba' : '#64748b'
  const hoverBg = isDark ? alpha('#fff', 0.05) : alpha('#11182d', 0.055)
  const { data: notifications = [] } = useClientNotifications(isAuthenticated)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !(notification.read ?? notification.isRead)).length,
    [notifications],
  )

  useEffect(() => {
    const root = document.documentElement
    const setTopBarOffset = () => {
      const height = Math.ceil(topBarRef.current?.getBoundingClientRect().height ?? 0)
      if (height > 0) root.style.setProperty('--client-navbar-offset', `${height}px`)
    }

    setTopBarOffset()

    if (typeof ResizeObserver === 'undefined' || !topBarRef.current) {
      return () => root.style.removeProperty('--client-navbar-offset')
    }

    const observer = new ResizeObserver(() => setTopBarOffset())
    observer.observe(topBarRef.current)

    return () => {
      observer.disconnect()
      root.style.removeProperty('--client-navbar-offset')
    }
  }, [])

  return (
    <Box
      ref={topBarRef}
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (muiTheme) => muiTheme.zIndex.drawer + 2,
        minHeight: { xs: 72, md: 64 },
        px: { xs: 1.5, md: 2 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        bgcolor: navBg,
        borderBottom: `1px solid ${borderColor}`,
        boxShadow: isDark ? 'none' : '0 8px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Stack direction="row" spacing={{ xs: 2, md: 1.5 }} alignItems="center" sx={{ minWidth: 0 }}>
        <IconButton
          size="small"
          onClick={handleDrawerToggle}
          sx={{
            width: { xs: 36, md: 32 },
            height: { xs: 36, md: 32 },
            borderRadius: 1,
            color: mutedColor,
            '&:hover': { bgcolor: hoverBg, color: textColor },
          }}
        >
          <TbLayoutSidebarLeftCollapseFilled
            size={20}
            style={{ transform: pinned ? 'none' : 'rotate(180deg)' }}
          />
        </IconButton>

        <Typography
          sx={{
            color: textColor,
            fontSize: { xs: '1rem', sm: '1.05rem', md: '1rem' },
            fontWeight: 650,
            letterSpacing: '-0.02em',
          }}
          noWrap
        >
          {activeSection}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flex: '1 1 520px',
          justifyContent: 'center',
          minWidth: 280,
          maxWidth: 560,
        }}
      >
        <GlobalSearch />
      </Box>

      <Stack
        direction="row"
        spacing={{ xs: 0.7, sm: 1 }}
        alignItems="center"
        justifyContent="flex-end"
        sx={{ minWidth: 0 }}
      >
        <QuickActions />

        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <WalletMenu compactLabel={`\u20B9${Number(walletBalance ?? 0).toLocaleString('en-IN')}`} />
        </Box>

        <Box
          onClick={() => navigate('/support/tickets')}
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            alignItems: 'center',
            gap: 0.8,
            height: 36,
            px: 1.35,
            borderRadius: 2,
            cursor: 'pointer',
            border: `1px solid ${borderColor}`,
            color: textColor,
            bgcolor: panelBg,
            fontSize: '0.84rem',
            fontWeight: 600,
            '& svg': { color: ACTIVE },
            '&:hover': { borderColor: alpha(ACTIVE, 0.5) },
          }}
        >
          <TbHeadphones size={18} />
          Support
        </Box>

        <Stack
          direction="row"
          spacing={0.25}
          sx={{
            height: 36,
            alignItems: 'center',
            p: 0.35,
            borderRadius: 999,
            bgcolor: isDark ? '#211f4d' : alpha(ACTIVE, 0.08),
            border: `1px solid ${alpha(ACTIVE, 0.18)}`,
          }}
        >
          <IconButton
            size="small"
            aria-label="Switch to light mode"
            aria-pressed={mode === 'light'}
            onClick={() => setMode('light')}
            sx={{
              width: 28,
              height: 28,
              color: mode === 'light' ? ORANGE : mutedColor,
              bgcolor: mode === 'light' ? alpha(ORANGE, 0.16) : 'transparent',
            }}
          >
            <MdLightMode size={16} />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Switch to dark mode"
            aria-pressed={mode === 'dark'}
            onClick={() => setMode('dark')}
            sx={{
              width: 28,
              height: 28,
              color: mode === 'dark' ? '#9b8cff' : mutedColor,
              bgcolor: mode === 'dark' ? alpha(ACTIVE, 0.16) : 'transparent',
            }}
          >
            <MdDarkMode size={16} />
          </IconButton>
        </Stack>

        <IconButton
          aria-label="Notifications"
          onClick={() => navigate('/notifications')}
          sx={{ width: 36, height: 36, color: mutedColor, '&:hover': { bgcolor: hoverBg, color: textColor } }}
        >
          <Badge
            badgeContent={unreadCount}
            max={99}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: ORANGE,
                color: '#fff',
                fontWeight: 700,
                minWidth: 18,
                height: 18,
                fontSize: '0.68rem',
              },
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                transformOrigin: '50% 12%',
                animation:
                  unreadCount > 0
                    ? 'fastship-notification-ring 1.35s ease-in-out infinite'
                    : 'none',
                '@keyframes fastship-notification-ring': {
                  '0%, 48%, 100%': { transform: 'rotate(0deg)' },
                  '8%': { transform: 'rotate(18deg)' },
                  '16%': { transform: 'rotate(-16deg)' },
                  '24%': { transform: 'rotate(12deg)' },
                  '32%': { transform: 'rotate(-9deg)' },
                  '40%': { transform: 'rotate(5deg)' },
                },
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                },
              }}
            >
              <MdNotifications size={21} />
            </Box>
          </Badge>
        </IconButton>

        <UserMenu compact />
      </Stack>
    </Box>
  )
}
