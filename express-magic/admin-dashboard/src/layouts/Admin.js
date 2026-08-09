// Chakra imports
import { Box, ChakraProvider, Flex, Portal, Spinner, Text, useColorModeValue, useDisclosure } from '@chakra-ui/react'
import Configurator from 'components/Configurator/Configurator'
import Footer from 'components/Footer/Footer.js'
// Layout components
import AdminNavbar from 'components/Navbars/AdminNavbar.js'
import Sidebar from 'components/Sidebar'
import { Suspense, useEffect, useState } from 'react'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
import routes from 'routes.js'
import { BRAND } from '../constants/brand'
// Custom Chakra theme
import theme from 'theme/theme.js'
import FixedPlugin from '../components/FixedPlugin/FixedPlugin'
// Custom components
import MainPanel from '../components/Layout/MainPanel'
import PanelContainer from '../components/Layout/PanelContainer'
import PanelContent from '../components/Layout/PanelContent'

const SIDEBAR_MIN_WIDTH = 248
const SIDEBAR_MAX_WIDTH = 360
const SIDEBAR_DEFAULT_WIDTH = 284

export default function Dashboard(props) {
  const { ...rest } = props
  const location = useLocation()
  // states and functions
  const [sidebarVariant, setSidebarVariant] = useState('opaque')
  const [fixed, setFixed] = useState(false)

  // 🆕 Sidebar resizing state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedValue = window.localStorage.getItem('adminSidebarWidth')
    const savedWidth = Number(savedValue)
    return savedValue && Number.isFinite(savedWidth) && savedWidth >= SIDEBAR_MIN_WIDTH
      ? Math.min(Math.max(savedWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH)
      : SIDEBAR_DEFAULT_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)

  // Resizing logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const newWidth = Math.min(Math.max(e.clientX, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH)
        setSidebarWidth(newWidth)
      }
    }
    const handleMouseUp = () => setIsResizing(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  useEffect(() => {
    window.localStorage.setItem('adminSidebarWidth', String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    document.title = `${BRAND.name} Admin`
  }, [])

  const getRoute = () => {
    return location.pathname !== '/admin/full-screen-maps'
  }
  const getActiveRoute = (routes) => {
    let activeRoute = 'Default Brand Text'
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveRoute = getActiveRoute(routes[i].views)
        if (collapseActiveRoute !== activeRoute) {
          return collapseActiveRoute
        }
      } else if (routes[i].category) {
        let categoryActiveRoute = getActiveRoute(routes[i].views)
        if (categoryActiveRoute !== activeRoute) {
          return categoryActiveRoute
        }
      } else {
        if (location.pathname.startsWith(routes[i].layout + routes[i].path.split('/:')[0])) {
          return routes[i].name
        }
      }
    }
    return activeRoute
  }
  // This changes navbar state(fixed or not)
  const getActiveNavbar = (routes) => {
    let activeNavbar = false
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].category) {
        let categoryActiveNavbar = getActiveNavbar(routes[i].views)
        if (categoryActiveNavbar !== activeNavbar) {
          return categoryActiveNavbar
        }
      } else {
        if (location.pathname.startsWith(routes[i].layout + routes[i].path.split('/:')[0])) {
          if (routes[i].secondaryNavbar) {
            return routes[i].secondaryNavbar
          }
        }
      }
    }
    return activeNavbar
  }
  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      // If it's a collapsible or category, go deeper
      if (prop.collapse || prop.category) {
        return getRoutes(prop.views)
      }

      // If it's a regular admin route, render it
      if (prop.layout === '/admin') {
        return <Route path={prop.layout + prop.path} component={prop.component} key={key} />
      }

      return null
    })
  }

  const { isOpen, onOpen, onClose } = useDisclosure()
  document.documentElement.dir = 'ltr'

  return (
    <ChakraProvider theme={theme} resetCss={false}>
      {/* Sidebar with dynamic width */}
      <Sidebar
        routes={routes}
        logoText={BRAND.name}
        sidebarVariant={sidebarVariant}
        sidebarWidth={sidebarWidth}
        {...rest}
      />

      {/* Main Panel adjusts with sidebar width */}
      <MainPanel
        minH="100vh"
        bg={useColorModeValue(
          'linear-gradient(180deg, #F5F8FC 0%, #FFFFFF 42%, #F7FAFD 100%)',
          'linear-gradient(180deg, #020D1F 0%, #041A38 48%, #020D1F 100%)',
        )}
        w={{
          base: '100%',
          xl: `calc(100% - ${sidebarWidth}px)`,
        }}
        ml={{ xl: `${sidebarWidth}px` }}
      >
        {/* Keep the global header mounted in normal page flow while lazy admin pages change. */}
        <AdminNavbar
          onOpen={onOpen}
          logoText={BRAND.name}
          brandText={getActiveRoute(routes)}
          secondary={false}
          fixed={false}
          sidebarWidth={sidebarWidth}
          {...rest}
        />

        {getRoute() ? (
          <PanelContent>
            <PanelContainer>
              <Suspense
                fallback={
                  <Flex minH="65vh" align="center" justify="center" direction="column" gap={3}>
                    <Spinner size="lg" color="brand.500" thickness="3px" />
                    <Text color="gray.500" fontSize="sm" fontWeight="600">
                      Loading admin workspace...
                    </Text>
                  </Flex>
                }
              >
                <Switch>
                  {getRoutes(routes)}
                  <Redirect from="/admin" to="/admin/dashboard" />
                </Switch>
              </Suspense>
            </PanelContainer>
          </PanelContent>
        ) : null}
        <Footer />
        <Portal>
          <FixedPlugin secondary={getActiveNavbar(routes)} fixed={fixed} onOpen={onOpen} />
        </Portal>
        <Configurator
          secondary={getActiveNavbar(routes)}
          isOpen={isOpen}
          onClose={onClose}
          isChecked={fixed}
          onSwitch={(value) => setFixed(value)}
          onOpaque={() => setSidebarVariant('opaque')}
          onTransparent={() => setSidebarVariant('transparent')}
        />
      </MainPanel>

      {/* 🖱️ Resize Handle */}
      <Box
        display={{ base: 'none', xl: 'block' }}
        position="fixed"
        left={`${sidebarWidth - 3}px`}
        top="0"
        h="100dvh"
        w="6px"
        cursor="col-resize"
        zIndex="1400"
        _hover={{ bg: useColorModeValue('rgba(6, 42, 91, 0.14)', 'rgba(6, 42, 91, 0.24)') }}
        onMouseDown={() => setIsResizing(true)}
      />
      </ChakraProvider>
  )
}
