import { Box, Drawer, Stack, useMediaQuery, useTheme } from '@mui/material'
import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/auth/AuthContext'
import Navbar from '../Navbar/Navbar'
import KeyboardShortcuts from './keyboard/KeyboardShortcuts'
import FullScreenLoader from './loader/FullScreenLoader'
import Sidebar, { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from './Sidebar'
import { useEmployeeSocket } from '../../hooks/useEmployeeSocket'

export default function Layout() {
  useEmployeeSocket()
  const theme = useTheme()
  const location = useLocation()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const sidebarExpanded = sidebarPinned || sidebarHovered
  const sidebarSpacerWidth = sidebarPinned ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH
  const { user } = useAuth()
  const isAdminWorkspace = user.role === 'admin' || user.role === 'employee' || Boolean(user.employeeId)
  const isDensePanelPage =
    location.pathname === '/orders/create' ||
    location.pathname === '/orders/new' ||
    location.pathname === '/orders/list' ||
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/dashboard/') ||
    location.pathname.startsWith('/billing/') ||
    location.pathname.startsWith('/shipments/') ||
    location.pathname.startsWith('/ops/') ||
    location.pathname.startsWith('/tools/') ||
    location.pathname.startsWith('/reports/') ||
    location.pathname.startsWith('/settings/') ||
    location.pathname.startsWith('/integration/') ||
    location.pathname.startsWith('/other/') ||
    location.pathname === '/support' ||
    location.pathname === '/profile' ||
    location.pathname === '/user-agreements' ||
    location.pathname === '/warehouse'

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev)
      return
    }

    setSidebarPinned((prev) => !prev)
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, isMobile])

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100dvw',
        overflowX: 'hidden',
        background: '#f4f7fb',
        scrollbarGutter: 'stable',
      }}
    >
      <KeyboardShortcuts />

      {isMobile ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          variant="temporary"
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_EXPANDED_WIDTH,
              maxWidth: '88vw',
              border: 0,
              background: '#FFFFFF',
              boxShadow: '0 18px 48px rgba(7, 25, 35, 0.14)',
            },
          }}
        >
          <Box sx={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Sidebar role={isAdminWorkspace ? 'admin' : 'customer'} pinned />
            </Box>
          </Box>
        </Drawer>
      ) : (
        <Box
          sx={{
            width: sidebarSpacerWidth,
            minWidth: sidebarSpacerWidth,
            flexShrink: 0,
            transition: 'width 220ms ease, min-width 220ms ease',
          }}
        >
          <Sidebar
            role={isAdminWorkspace ? 'admin' : 'customer'}
            pinned={sidebarExpanded}
            onMouseEnter={() => setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
            fixed
          />
        </Box>
      )}

      <Stack
        sx={{
          flex: 1,
          width: { xs: '100%', md: 'auto' },
          minWidth: 0,
          maxWidth: '100%',
          minHeight: '100vh',
          p: 0,
          gap: 0,
          scrollbarGutter: 'stable',
        }}
      >
        <Navbar handleDrawerToggle={handleDrawerToggle} pinned={sidebarPinned} onPinChange={setSidebarPinned} />

        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            p: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.72)',
          }}
        >
          <Box
            sx={{
              maxWidth: 'none',
              mx: 'auto',
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              px: isDensePanelPage ? 0 : { xs: 1.25, sm: 1.5, md: 2, lg: 2.5 },
              py: isDensePanelPage ? 0 : { xs: 0.6, sm: 1, md: 1.5 },
            }}
          >
            <Suspense
              fallback={
                <Box key={`layout-fallback-${location.pathname}`} sx={{ minHeight: 300 }}>
                  <FullScreenLoader />
                </Box>
              }
            >
              <Box
                key={location.pathname}
                sx={{
                  width: '100%',
                  minWidth: 0,
                  maxWidth: '100%',
                  minHeight: '300px',
                }}
              >
                <Outlet />
              </Box>
            </Suspense>
          </Box>
        </Box>

        {!isDensePanelPage && (
          <Box
            sx={{
              maxWidth: 1700,
              mx: 'auto',
              width: '100%',
              px: { xs: 1.25, sm: 1.5, md: 2 },
              pt: 0.4,
              borderTop: '1px solid rgba(6, 42, 91, 0.12)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: { xs: 'center', md: 'space-between' },
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                py: 1.5,
                color: 'text.secondary',
                fontSize: '0.72rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <Box
                component="a"
                href="https://searchcraftdigital.com/"
                target="_blank"
                rel="noreferrer"
                sx={{
                  color: 'inherit',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '6px',
                  fontStyle: 'italic',
                  transition: 'color 180ms ease',
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                Crafted by SearchCraft Digital
              </Box>
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
