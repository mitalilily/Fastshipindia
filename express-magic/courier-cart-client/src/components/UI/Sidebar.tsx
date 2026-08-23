import {
  alpha,
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useState } from 'react'
import {
  TbAlertTriangle,
  TbApps,
  TbArrowBackUp,
  TbBuildingWarehouse,
  TbCalculator,
  TbChevronDown,
  TbCurrencyRupee,
  TbFileAnalytics,
  TbHeadset,
  TbHome,
  TbLayoutDashboard,
  TbListDetails,
  TbPackage,
  TbPackageExport,
  TbPlugConnected,
  TbReceipt,
  TbRoute,
  TbScale,
  TbSettings,
  TbShoppingCart,
  TbTool,
  TbTruckDelivery,
  TbWallet,
} from 'react-icons/tb'
import { NavLink, useLocation } from 'react-router-dom'

import type { JSX } from '@emotion/react/jsx-runtime'
import BrandLogo from '../brand/BrandLogo'
import { brand } from '../../theme/brand'
import { isActive } from '../../utils/functions'
import { useAuth } from '../../context/auth/AuthContext'

export type Role = 'customer' | 'admin'

export interface SubItem {
  text: string
  path: string
  icon?: JSX.Element
}

export interface NavItem {
  text: string
  icon: JSX.Element
  path: string
  roles: Role[]
  children?: SubItem[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

interface SidebarProps {
  role?: Role
  pinned: boolean
  handleDrawerToggle: () => void
  temporary?: boolean
  onNavigate?: () => void
}

export const COLLAPSED_WIDTH = 88
export const DESKTOP_SIDEBAR_WIDTH = 260

const STANDARD_ICON_SIZE = 21
const ACTIVE = brand.navy
const ACCENT = brand.red

const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      {
        text: 'Home',
        icon: <TbHome size={STANDARD_ICON_SIZE} />,
        path: '/home',
        roles: ['customer', 'admin'],
      },
      {
        text: 'Dashboard',
        icon: <TbLayoutDashboard size={STANDARD_ICON_SIZE} />,
        path: '/dashboard',
        roles: ['customer', 'admin'],
      },
      {
        text: 'Orders',
        icon: <TbShoppingCart size={STANDARD_ICON_SIZE} />,
        path: '/orders',
        roles: ['customer', 'admin'],
        children: [
          { text: 'All Orders', path: '/orders/list', icon: <TbListDetails size={STANDARD_ICON_SIZE} /> },
          { text: 'Create Order', path: '/orders/create', icon: <TbPackageExport size={STANDARD_ICON_SIZE} /> },
          { text: 'B2C Orders', path: '/orders/b2c/list', icon: <TbPackage size={STANDARD_ICON_SIZE} /> },
          { text: 'B2B Orders', path: '/orders/b2b/list', icon: <TbBuildingWarehouse size={STANDARD_ICON_SIZE} /> },
        ],
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        text: 'Reports',
        icon: <TbFileAnalytics size={STANDARD_ICON_SIZE} />,
        path: '/reports',
        roles: ['customer', 'admin'],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        text: 'Billing',
        icon: <TbReceipt size={STANDARD_ICON_SIZE} />,
        path: '/billing',
        roles: ['customer', 'admin'],
        children: [
          { text: 'Passbook', path: '/billing/passbook', icon: <TbWallet size={STANDARD_ICON_SIZE} /> },
          { text: 'COD Remittance', path: '/billing/cod-remittance', icon: <TbCurrencyRupee size={STANDARD_ICON_SIZE} /> },
          { text: 'Shipping Charges', path: '/billing/shipping-charges', icon: <TbTruckDelivery size={STANDARD_ICON_SIZE} /> },
          { text: 'All Recharges', path: '/billing/all-recharges', icon: <TbWallet size={STANDARD_ICON_SIZE} /> },
          { text: 'Invoices', path: '/billing/invoices', icon: <TbReceipt size={STANDARD_ICON_SIZE} /> },
          { text: 'Credit Notes', path: '/billing/credit-notes', icon: <TbCurrencyRupee size={STANDARD_ICON_SIZE} /> },
          { text: 'Debit Notes', path: '/billing/debit-notes', icon: <TbReceipt size={STANDARD_ICON_SIZE} /> },
          { text: 'Ledgers', path: '/billing/ledgers', icon: <TbListDetails size={STANDARD_ICON_SIZE} /> },
        ],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        text: 'Operations',
        icon: <TbAlertTriangle size={STANDARD_ICON_SIZE} />,
        path: '/ops',
        roles: ['customer', 'admin'],
        children: [
          { text: 'NDR', path: '/ops/ndr', icon: <TbAlertTriangle size={STANDARD_ICON_SIZE} /> },
          { text: 'RTO', path: '/ops/rto', icon: <TbArrowBackUp size={STANDARD_ICON_SIZE} /> },
        ],
      },
      {
        text: 'Warehouse',
        icon: <TbBuildingWarehouse size={STANDARD_ICON_SIZE} />,
        path: '/settings/manage_pickups',
        roles: ['customer', 'admin'],
      },
      {
        text: 'Reconciliation',
        icon: <TbScale size={STANDARD_ICON_SIZE} />,
        path: '/reconciliation/weight',
        roles: ['customer', 'admin'],
      },
    ],
  },
  {
    title: 'Integrations',
    items: [
      {
        text: 'Integrations',
        icon: <TbPlugConnected size={STANDARD_ICON_SIZE} />,
        path: '/channels',
        roles: ['customer', 'admin'],
        children: [
          { text: 'Couriers', path: '/couriers/partners', icon: <TbTruckDelivery size={STANDARD_ICON_SIZE} /> },
          { text: 'Channels', path: '/channels/connected', icon: <TbApps size={STANDARD_ICON_SIZE} /> },
        ],
      },
    ],
  },
  {
    title: 'Tools',
    items: [
      {
        text: 'Tools',
        icon: <TbTool size={STANDARD_ICON_SIZE} />,
        path: '/tools',
        roles: ['customer', 'admin'],
        children: [
          { text: 'Rate Calculator', path: '/tools/rate_calculator', icon: <TbCalculator size={STANDARD_ICON_SIZE} /> },
          { text: 'Order Tracking', path: '/tools/order_tracking', icon: <TbRoute size={STANDARD_ICON_SIZE} /> },
        ],
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        text: 'Support',
        icon: <TbHeadset size={STANDARD_ICON_SIZE} />,
        path: '/support/tickets',
        roles: ['customer', 'admin'],
      },
    ],
  },
]

const settingsItem: NavItem = {
  text: 'Settings',
  icon: <TbSettings size={STANDARD_ICON_SIZE} />,
  path: '/settings',
  roles: ['customer', 'admin'],
}

const getNavigationMatchPath = (path: string) => path.split(/[?#]/)[0] || path

const itemHasActiveChild = (pathname: string, item: NavItem) =>
  Boolean(item.children?.some((sub) => isActive(pathname, getNavigationMatchPath(sub.path))))

export default function Sidebar({
  role = 'customer',
  pinned,
  temporary = false,
  onNavigate,
}: SidebarProps) {
  const location = useLocation()
  const theme = useTheme()
  const { user } = useAuth()
  const isSidebarExpanded = temporary || pinned
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const isDark = theme.palette.mode === 'dark'
  const DARK_BG = isDark ? '#151b23' : '#ffffff'
  const BORDER = isDark ? '#2a313a' : 'rgba(15, 23, 42, 0.1)'
  const TEXT = isDark ? '#a9b8cc' : '#586b8a'
  const MUTED = isDark ? '#8798ad' : '#8492aa'
  const WHITE = isDark ? '#f8fafc' : '#11182d'
  const itemHoverBg = isDark ? alpha('#ffffff', 0.035) : alpha('#11182d', 0.045)
  const childHoverBg = isDark ? alpha('#ffffff', 0.045) : alpha(ACTIVE, 0.07)
  const activeBg = isDark ? alpha(ACTIVE, 0.28) : alpha(ACTIVE, 0.08)
  const childActiveBg = isDark ? alpha(ACTIVE, 0.24) : alpha(ACTIVE, 0.1)
  const iconMuted = isDark ? '#91a7c3' : alpha(ACTIVE, 0.58)
  const activeText = isDark ? '#d9e7fa' : ACTIVE
  const initialsBg = isDark ? alpha(ACTIVE, 0.34) : alpha(ACTIVE, 0.09)
  const initialsBorder = isDark ? alpha('#ffffff', 0.1) : alpha(ACCENT, 0.28)
  const initialsColor = isDark ? '#f8fafc' : ACTIVE

  useEffect(() => {
    if (!isSidebarExpanded) setExpandedItems({})
  }, [isSidebarExpanded])

  useEffect(() => {
    const activeParent = [...navSections.flatMap((section) => section.items), settingsItem].find((item) =>
      item.children?.some((sub) => isActive(location.pathname, getNavigationMatchPath(sub.path))),
    )
    setExpandedItems(activeParent ? { [activeParent.text]: true } : {})
  }, [location.pathname])

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => (prev[key] ? {} : { [key]: true }))
  }

  const handleRouteNavigate = () => {
    onNavigate?.()
  }

  const navItemSx = {
    minHeight: isSidebarExpanded
      ? temporary
        ? 'clamp(34px, 5.2vh, 43px)'
        : 'clamp(29px, 4.25vh, 38px)'
      : 44,
    borderRadius: isSidebarExpanded ? 0 : 1.5,
    px: isSidebarExpanded ? (temporary ? 3.6 : 2.75) : 0,
    py: 0,
    mx: isSidebarExpanded ? 0 : 1.25,
    color: TEXT,
    position: 'relative',
    transition: 'background-color 160ms ease, color 160ms ease',
    '&:hover': {
      bgcolor: itemHoverBg,
      color: WHITE,
      '& .MuiListItemIcon-root': { color: ACTIVE },
    },
    '@media (max-height: 760px)': {
      '& .MuiListItemIcon-root svg': { width: 19, height: 19 },
    },
  }

  const activeItemSx = {
    bgcolor: activeBg,
    color: activeText,
    '& .MuiListItemIcon-root': { color: ACCENT },
    '& .MuiListItemText-primary': { fontWeight: 600 },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 11,
      bottom: 11,
      width: 4,
      borderRadius: '0 8px 8px 0',
      bgcolor: ACCENT,
      '@media (max-height: 760px)': {
        top: 7,
        bottom: 7,
      },
    },
  }

  const renderItem = (item: NavItem) => {
    const itemMatchPath = getNavigationMatchPath(item.path)
    const isSettingsRoot = item.text === settingsItem.text
    const isSelected = isSettingsRoot ? location.pathname === itemMatchPath : isActive(location.pathname, itemMatchPath)
    const hasChildren = Boolean(item.children?.length)
    const childSelected = itemHasActiveChild(location.pathname, item)
    const isExpanded = expandedItems[item.text]
    const showExpanded = isSidebarExpanded && isExpanded
    const active = (isSelected && !hasChildren) || childSelected

    const listItem = (
      <ListItemButton
        component={hasChildren ? 'div' : NavLink}
        to={hasChildren ? undefined : item.path}
        onClick={hasChildren ? () => toggleExpand(item.text) : handleRouteNavigate}
        sx={{
          ...navItemSx,
          justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
          ...(active ? activeItemSx : {}),
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: isSidebarExpanded ? 38 : 36,
            width: isSidebarExpanded ? 'auto' : 36,
            height: isSidebarExpanded ? 'auto' : 36,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            color: active ? ACCENT : iconMuted,
            transition: 'color 160ms ease',
            '& svg': {
              strokeWidth: 2.4,
            },
          }}
        >
          {item.icon}
        </ListItemIcon>
        {isSidebarExpanded ? (
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{
              fontSize: temporary
                ? 'clamp(0.86rem, 2vh, 1rem)'
                : 'clamp(0.78rem, 2vh, 0.9rem)',
              fontWeight: active ? 650 : 500,
              letterSpacing: '-0.01em',
            }}
          />
        ) : null}
        {hasChildren && isSidebarExpanded ? (
          <TbChevronDown
            size={20}
            style={{
              transform: showExpanded ? 'rotate(180deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s',
              color: active ? activeText : iconMuted,
              strokeWidth: 2.4,
            }}
          />
        ) : null}
      </ListItemButton>
    )

    return (
      <Box key={item.text}>
        {isSidebarExpanded ? (
          listItem
        ) : (
          <Tooltip title={item.text} placement="right">
            <Box>{listItem}</Box>
          </Tooltip>
        )}

        {hasChildren && isSidebarExpanded && (
          <Collapse in={showExpanded} timeout="auto" unmountOnExit>
            <List disablePadding sx={{ ml: 6.6, pr: 1.5, py: 0.35 }}>
              {item.children?.map((sub) => {
                const subActive = isActive(location.pathname, sub.path)
                return (
                  <ListItemButton
                    key={sub.text}
                    component={NavLink}
                    to={sub.path}
                    onClick={handleRouteNavigate}
                    sx={{
                      minHeight: 'clamp(28px, 3.8vh, 32px)',
                      px: 1.2,
                      py: 0.45,
                      borderRadius: 1,
                      color: subActive ? WHITE : TEXT,
                      bgcolor: subActive ? childActiveBg : 'transparent',
                      '&:hover': {
                        bgcolor: childHoverBg,
                        color: WHITE,
                      },
                      mb: 0.25,
                    }}
                  >
                    <ListItemText
                      primary={sub.text}
                      primaryTypographyProps={{
                        fontSize: 'clamp(0.76rem, 1.9vh, 0.88rem)',
                        fontWeight: subActive ? 650 : 500,
                      }}
                    />
                  </ListItemButton>
                )
              })}
            </List>
          </Collapse>
        )}
      </Box>
    )
  }

  const visibleSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role || 'customer')),
  }))

  const displayName = user?.companyInfo?.contactPerson || user?.name || 'Sahil Mittal'
  const displayEmail = user?.companyInfo?.contactEmail || user?.email || 'sahilmittal1920@gmail...'
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Box
      sx={{
        width: temporary ? '100%' : isSidebarExpanded ? DESKTOP_SIDEBAR_WIDTH : COLLAPSED_WIDTH,
        height: temporary ? '100%' : '100dvh',
        maxHeight: temporary ? '100%' : '100dvh',
        background: DARK_BG,
        borderRight: `1px solid ${BORDER}`,
        transition: 'width 220ms ease',
        display: 'flex',
        flexDirection: 'column',
        zIndex: theme.zIndex.drawer,
        position: temporary ? 'relative' : 'fixed',
        left: temporary ? 'auto' : 0,
        top: temporary ? 'auto' : 0,
        overflow: 'hidden',
        boxShadow: 'none',
        contain: 'layout paint style',
        willChange: temporary ? 'auto' : 'width',
      }}
    >
      <Box
        sx={{
          height: temporary ? 'clamp(58px, 8vh, 72px)' : 'clamp(48px, 7.2vh, 64px)',
          px: isSidebarExpanded ? (temporary ? 2.25 : 1.75) : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
          flexShrink: 0,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <BrandLogo
          compact={!isSidebarExpanded}
          sx={{
            width: isSidebarExpanded
              ? temporary
                ? 'clamp(138px, 18vh, 156px)'
                : 'clamp(124px, 17vh, 144px)'
              : 56,
            height: isSidebarExpanded
              ? temporary
                ? 'clamp(46px, 6.2vh, 52px)'
                : 'clamp(42px, 5.8vh, 48px)'
              : 32,
            aspectRatio: 'auto',
            backgroundSize: isSidebarExpanded ? 'cover' : '68px 68px',
            backgroundPosition: 'center',
            flexShrink: 0,
          }}
        />
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha(ACTIVE, isDark ? 0.55 : 0.35)} transparent`,
          msOverflowStyle: 'auto',
          WebkitOverflowScrolling: 'touch',
          py: temporary ? 'clamp(6px, 1.4vh, 12px)' : 'clamp(4px, 1vh, 8px)',
          bgcolor: DARK_BG,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 999,
            backgroundColor: alpha(ACTIVE, isDark ? 0.48 : 0.26),
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: alpha(ACTIVE, isDark ? 0.62 : 0.38),
          },
        }}
      >
        {visibleSections.map((section) =>
          section.items.length ? (
            <Box
              key={section.title}
              sx={{
                mb: temporary
                  ? 'clamp(6px, 1.8vh, 18px)'
                  : isSidebarExpanded
                    ? 'clamp(3px, 1.1vh, 12px)'
                    : 0.5,
              }}
            >
              {isSidebarExpanded ? (
                <Typography
                  sx={{
                    px: temporary ? 3.6 : 2.75,
                    mb: temporary
                      ? 'clamp(2px, 0.7vh, 6px)'
                      : 'clamp(1px, 0.45vh, 4px)',
                    color: MUTED,
                    fontSize: temporary
                      ? 'clamp(0.7rem, 1.7vh, 0.82rem)'
                      : 'clamp(0.6rem, 1.5vh, 0.72rem)',
                    lineHeight: 1.15,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0,
                  }}
                >
                  {section.title}
                </Typography>
              ) : null}
              <List
                disablePadding
                sx={isSidebarExpanded ? undefined : { display: 'grid', gap: 0.5 }}
              >
                {section.items.map(renderItem)}
              </List>
            </Box>
          ) : null,
        )}
      </Box>

      <Box sx={{ flexShrink: 0, borderTop: `1px solid ${BORDER}`, bgcolor: DARK_BG }}>
        {renderItem(settingsItem)}
        {isSidebarExpanded ? (
          <Box
            sx={{
              px: temporary ? 3.6 : 2.75,
              py: temporary
                ? 'clamp(8px, 1.8vh, 15px)'
                : 'clamp(6px, 1.35vh, 10px)',
              borderTop: `1px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.35,
            }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: initialsColor,
                bgcolor: initialsBg,
                border: `1px solid ${initialsBorder}`,
                fontSize: '0.9rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{ color: WHITE, fontWeight: 600, fontSize: temporary ? '0.98rem' : '0.88rem' }}
                noWrap
              >
                {displayName}
              </Typography>
              <Typography
                sx={{ color: TEXT, fontWeight: 600, fontSize: temporary ? '0.85rem' : '0.76rem' }}
                noWrap
              >
                {displayEmail}
              </Typography>
            </Box>
            <TbChevronDown size={19} color={TEXT} />
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
