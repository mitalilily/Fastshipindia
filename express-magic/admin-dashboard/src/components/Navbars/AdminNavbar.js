import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import {
  IconBell,
  IconBolt,
  IconChartBar,
  IconDashboard,
  IconHelpCircle,
  IconKey,
  IconLayoutSidebarLeftCollapse,
  IconLogout,
  IconMapPin,
  IconMenu2,
  IconPackageExport,
  IconSettings,
  IconTruck,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react'
import { useSocket } from 'hooks/useSocket'
import PropTypes from 'prop-types'
import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { getNotifications } from 'services/notification.service'
import { useAuthStore } from 'store/useAuthStore'
import { useNotificationsStore } from 'store/useNotificationsStore'

export default function AdminNavbar(props) {
  const { onOpen, onToggleSidebar, isSidebarCollapsed = false, sidebarWidth = 260, brandText } = props
  const history = useHistory()
  const logout = useAuthStore((state) => state.logout)
  const { unreadCount, setNotifications } = useNotificationsStore()
  useSocket()

  const navBg = useColorModeValue('#FFFFFF', '#161B22')
  const borderColor = useColorModeValue('#E2E8F0', '#30363D')
  const titleColor = useColorModeValue('#0F172A', '#E6EDF3')
  const iconColor = useColorModeValue('#64748B', '#8B949E')
  const iconHoverBg = useColorModeValue('#F9FAFB', '#21262D')
  const iconHoverColor = useColorModeValue('#0F172A', '#E6EDF3')
  const notificationBg = useColorModeValue('#F9FAFB', '#21262D')
  const notificationHoverBg = useColorModeValue('#EDE9FE', '#30363D')
  const avatarBg = useColorModeValue('#EDE9FE', '#6C5CE7')
  const avatarColor = useColorModeValue('#5A4BD1', '#FFFFFF')
  const menuBg = useColorModeValue('#FFFFFF', '#161B22')
  const menuText = useColorModeValue('#0F172A', '#E6EDF3')
  const menuMuted = useColorModeValue('#64748B', '#8B949E')
  const menuHoverBg = useColorModeValue('#F9FAFB', '#21262D')
  const widgetBg = useColorModeValue('#F8FAFF', '#21262D')
  const widgetBorder = useColorModeValue('#E5EAF3', '#30363D')
  const widgetAccentBg = useColorModeValue('#EDE9FE', 'rgba(108, 92, 231, 0.18)')
  const widgetAccent = useColorModeValue('#5A4BD1', '#B7AEFF')
  const liveBg = useColorModeValue('#E9FBF4', 'rgba(74, 222, 128, 0.14)')
  const liveColor = useColorModeValue('#00A881', '#4ADE80')

  const handleLogout = () => {
    logout()
    history.replace('/login')
  }

  useEffect(() => {
    let mounted = true

    getNotifications()
      .then((data) => {
        if (mounted) setNotifications(data?.notifications || [])
      })
      .catch(() => {
        if (mounted) setNotifications([])
      })

    return () => {
      mounted = false
    }
  }, [setNotifications])

  const quickLinks = [
    { label: 'Orders', route: '/admin/orders', icon: IconPackageExport },
    { label: 'Users', route: '/admin/users-management', icon: IconUsers },
    { label: 'Couriers', route: '/admin/couriers', icon: IconTruck },
    { label: 'Serviceability', route: '/admin/serviceability', icon: IconMapPin },
    { label: 'Reports', route: '/admin/reports', icon: IconChartBar },
    { label: 'COD Remittance', route: '/admin/cod-remittance', icon: IconWallet },
    { label: 'Support', route: '/admin/support', icon: IconHelpCircle },
  ]

  return (
    <Flex
      position="fixed"
      top="0"
      left={{ base: '0', xl: `${sidebarWidth}px` }}
      right="0"
      h="58px"
      px={{ base: '14px', md: '22px' }}
      align="center"
      justify="space-between"
      bg={navBg}
      borderBottom="1px solid"
      borderColor={borderColor}
      zIndex="1200"
    >
      <HStack spacing="14px" minW={0}>
        <IconButton
          aria-label="Open menu"
          display={{ base: 'inline-flex', xl: 'none' }}
          icon={<IconMenu2 size={20} />}
          onClick={onOpen}
          variant="ghost"
          color={iconColor}
          _hover={{ bg: iconHoverBg, color: iconHoverColor }}
        />
        <IconButton
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          display={{ base: 'none', xl: 'inline-flex' }}
          icon={<IconLayoutSidebarLeftCollapse size={19} />}
          variant="ghost"
          color={iconColor}
          _hover={{ bg: iconHoverBg, color: iconHoverColor }}
          onClick={onToggleSidebar}
        />
        <Text color={titleColor} fontSize="16px" fontWeight="800" noOfLines={1}>
          {brandText || 'Dashboard'}
        </Text>
      </HStack>

      <HStack spacing={{ base: '8px', md: '10px' }}>
        <HStack spacing="8px" display={{ base: 'none', lg: 'flex' }}>
          <Flex
            h="32px"
            px="11px"
            align="center"
            gap="7px"
            borderRadius="999px"
            bg={liveBg}
            color={liveColor}
            fontSize="12px"
            fontWeight="800"
          >
            <Box w="7px" h="7px" borderRadius="full" bg={liveColor} />
            Live
          </Flex>
          <Flex
            h="32px"
            px="11px"
            align="center"
            gap="7px"
            borderRadius="999px"
            bg={widgetBg}
            border="1px solid"
            borderColor={widgetBorder}
            color={menuMuted}
            fontSize="12px"
            fontWeight="800"
          >
            <IconBell size={14} />
            {unreadCount || 0} alerts
          </Flex>
        </HStack>

        <Menu placement="bottom-end">
          <MenuButton
            as={Button}
            h="34px"
            px="12px"
            minW="auto"
            borderRadius="12px"
            bg={widgetAccentBg}
            color={widgetAccent}
            fontSize="13px"
            fontWeight="800"
            leftIcon={<IconBolt size={16} />}
            _hover={{ bg: notificationHoverBg }}
            _active={{ bg: notificationHoverBg }}
          >
            Quick
          </MenuButton>
          <MenuList
            bg={menuBg}
            borderColor={borderColor}
            color={menuText}
            boxShadow="0 18px 42px rgba(15, 23, 42, 0.18)"
            minW="240px"
            zIndex="popover"
          >
            <Box px="13px" py="10px">
              <Text fontSize="13px" fontWeight="900">
                Quick Options
              </Text>
              <Text fontSize="11px" color={menuMuted}>
                Jump to common admin tools
              </Text>
            </Box>
            <MenuDivider borderColor={borderColor} />
            {quickLinks.map((link) => (
              <MenuItem
                key={link.route}
                icon={<link.icon size={17} />}
                _hover={{ bg: menuHoverBg }}
                fontSize="13px"
                fontWeight="700"
                onClick={() => history.push(link.route)}
              >
                {link.label}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>

        <Box position="relative">
          <IconButton
            aria-label="Notifications"
            icon={<IconBell size={18} />}
            w="34px"
            h="34px"
            borderRadius="50%"
            variant="ghost"
            color={titleColor}
            bg={notificationBg}
            _hover={{ bg: notificationHoverBg }}
            onClick={() => history.push('/admin/notifications')}
          />
          {unreadCount > 0 ? (
            <Badge
              position="absolute"
              top="-3px"
              right="-7px"
              bg="#f97316"
              color="white"
              borderRadius="999px"
              fontSize="10px"
              minW="18px"
              h="18px"
              px="5px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {unreadCount}
            </Badge>
          ) : null}
        </Box>

        <Menu placement="bottom-end">
          <MenuButton
            as={Button}
            h="36px"
            w="36px"
            minW="36px"
            p="0"
            variant="ghost"
            borderRadius="999px"
            color={titleColor}
            _hover={{ bg: iconHoverBg }}
            _active={{ bg: iconHoverBg }}
          >
            <HStack spacing="8px">
              <Flex
                w="30px"
                h="30px"
                borderRadius="50%"
                align="center"
                justify="center"
                bg={avatarBg}
                color={avatarColor}
                fontSize="12px"
                fontWeight="800"
                flexShrink={0}
              >
                SA
              </Flex>
            </HStack>
          </MenuButton>
          <MenuList
            bg={menuBg}
            borderColor={borderColor}
            color={menuText}
            boxShadow="0 18px 42px rgba(15, 23, 42, 0.18)"
            minW="220px"
            zIndex="popover"
          >
            <Box px="12px" py="10px">
              <Text fontSize="sm" fontWeight="800">
                Super Admin
              </Text>
              <Text fontSize="xs" color={menuMuted}>
                Admin workspace
              </Text>
            </Box>
            <MenuDivider borderColor={borderColor} />
            <MenuItem icon={<IconDashboard size={18} />} _hover={{ bg: menuHoverBg }} onClick={() => history.push('/admin/dashboard')}>
              Dashboard
            </MenuItem>
            <MenuItem icon={<IconKey size={18} />} _hover={{ bg: menuHoverBg }} onClick={() => history.push('/admin/settings/change-password')}>
              Change password
            </MenuItem>
            <MenuItem icon={<IconSettings size={18} />} _hover={{ bg: menuHoverBg }} onClick={() => history.push('/admin/settings/payment-options')}>
              Payment options
            </MenuItem>
            <MenuDivider borderColor={borderColor} />
            <MenuItem icon={<IconLogout size={18} />} color="red.400" _hover={{ bg: menuHoverBg }} onClick={handleLogout}>
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  )
}

AdminNavbar.propTypes = {
  variant: PropTypes.string,
  secondary: PropTypes.bool,
  fixed: PropTypes.bool,
  onOpen: PropTypes.func,
  onToggleSidebar: PropTypes.func,
  isSidebarCollapsed: PropTypes.bool,
  sidebarWidth: PropTypes.number,
}
