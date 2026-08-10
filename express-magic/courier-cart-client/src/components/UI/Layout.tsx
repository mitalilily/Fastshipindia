import { Box, CircularProgress, Container, Drawer, Stack, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { DRAWER_WIDTH } from '../../utils/constants'
import Navbar from '../Navbar/Navbar'
import KeyboardShortcuts from './keyboard/KeyboardShortcuts'
import Sidebar, { COLLAPSED_WIDTH, DESKTOP_SIDEBAR_WIDTH } from './Sidebar'

function RouteContentLoader() {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        minHeight: { xs: 240, md: 320 },
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Stack alignItems="center" spacing={1.2}>
        <CircularProgress size={30} thickness={4} sx={{ color: '#ff7a17' }} />
        <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 500 }}>
          Loading workspace…
        </Typography>
      </Stack>
    </Box>
  )
}

export default function Layout() {
  const theme = useTheme()
  const location = useLocation()
  const outlet = useOutlet()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const mainScrollRef = useRef<HTMLDivElement | null>(null)
  const [pinned, setPinned] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isDark = theme.palette.mode === 'dark'
  const shellBg = isDark ? '#0f141b' : '#f6f8fc'
  const drawerBg = isDark ? '#151b23' : '#ffffff'
  const drawerText = isDark ? '#f8fafc' : '#11182d'
  const drawerBorder = isDark ? '#2a313a' : 'rgba(15, 23, 42, 0.1)'
  const routeContentKey = [location.key, location.pathname, location.search, location.hash]
    .filter(Boolean)
    .join(':')

  const handleDrawerToggle = () => {
    if (isMobile) setMobileOpen(!mobileOpen)
    else setPinned((prev) => !prev)
  }

  useEffect(() => {
    setMobileOpen(false)
    setHovered(false)
  }, [routeContentKey])

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, left: 0 })
    document.body.style.removeProperty('overflow')
    document.body.style.removeProperty('padding-right')
  }, [routeContentKey])

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        height: '100dvh',
        minHeight: '100dvh',
        minWidth: 0,
        overflow: 'hidden',
        background: shellBg,
      }}
    >
      <KeyboardShortcuts />

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              maxWidth: '86vw',
              top: 'var(--client-navbar-offset, 88px)',
              height: 'calc(100dvh - var(--client-navbar-offset, 88px))',
              bgcolor: drawerBg,
              color: drawerText,
              borderRight: `1px solid ${drawerBorder}`,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              overflow: 'hidden',
            },
          }}
        >
          <Sidebar
            hovered={hovered}
            setHovered={setHovered}
            pinned
            temporary
            handleDrawerToggle={handleDrawerToggle}
            onNavigate={() => setMobileOpen(false)}
          />
        </Drawer>
      ) : (
        <Box
          sx={{
            width: pinned ? DESKTOP_SIDEBAR_WIDTH : COLLAPSED_WIDTH,
            minWidth: pinned ? DESKTOP_SIDEBAR_WIDTH : COLLAPSED_WIDTH,
            flexShrink: 0,
            transition: 'width 240ms ease',
            willChange: 'width',
            position: 'relative',
          }}
        >
          <Sidebar
            hovered={hovered}
            setHovered={setHovered}
            pinned={pinned}
            handleDrawerToggle={handleDrawerToggle}
          />
        </Box>
      )}

      <Stack
        sx={{
          flexGrow: 1,
          minWidth: 0,
          position: 'relative',
          height: '100dvh',
          minHeight: 0,
          overflow: 'hidden',
          bgcolor: shellBg,
        }}
      >
        <Stack sx={{ flexGrow: 1, height: '100%', minHeight: 0, overflow: 'hidden', bgcolor: shellBg }}>
          <Box
            sx={{
              flexShrink: 0,
              position: 'relative',
              zIndex: (layoutTheme) => layoutTheme.zIndex.drawer + 2,
            }}
          >
            <Navbar handleDrawerToggle={handleDrawerToggle} pinned={pinned} />
          </Box>

          <Box
            component="main"
            ref={mainScrollRef}
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              bgcolor: shellBg,
              position: 'relative',
              zIndex: 0,
              px: { xs: 1.5, md: 2 },
              pb: { xs: 1.5, md: 2 },
              height: '100%',
              minHeight: 0,
              overscrollBehavior: 'contain',
              scrollbarGutter: 'stable',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <Container
              maxWidth="xl"
              sx={{
                bgcolor: 'transparent',
                pt: { xs: 2, md: 2 },
                px: { xs: 0, md: 0 },
                overflowX: 'visible',
              }}
            >
              <Suspense fallback={<RouteContentLoader />}>
                <Box sx={{ display: 'contents' }}>{outlet}</Box>
              </Suspense>
            </Container>
          </Box>
        </Stack>
      </Stack>
    </Box>
  )
}
