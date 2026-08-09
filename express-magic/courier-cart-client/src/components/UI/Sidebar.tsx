import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip } from '@mui/material'
import { useMemo, useState, type JSX } from 'react'
import {
  TbAlertCircle,
  TbBuildingWarehouse,
  TbChevronDown,
  TbHome,
  TbPackage,
  TbPlugConnected,
  TbSettings,
  TbTool,
  TbTruckDelivery,
  TbWallet,
  TbReportAnalytics,
  TbLayoutSidebar,
} from 'react-icons/tb'
import { NavLink, useLocation } from 'react-router-dom'

export type Role = 'customer' | 'admin'

export interface SubItem {
  text: string
  path: string
}

export interface NavItem {
  text: string
  icon: JSX.Element
  path: string
  roles: Role[]
  children?: SubItem[]
}

interface SidebarProps {
  role?: Role
  pinned?: boolean
  onPinChange?: (pinned: boolean) => void
  fixed?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const SIDEBAR_EXPANDED_WIDTH = 244
export const SIDEBAR_COLLAPSED_WIDTH = 114

const teal = '#0789ad'
const ink = '#0b1f36'
const muted = '#334155'
const border = '#e1e8f0'

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <TbHome />, path: '/dashboard', roles: ['customer', 'admin'] },
  {
    text: 'Orders',
    icon: <TbPackage />,
    path: '/orders/new',
    roles: ['customer', 'admin'],
    children: [
      { text: 'New', path: '/orders/new' },
      { text: 'Courier Assigned', path: '/orders/list?status=courier_assigned' },
      { text: 'Pickups & Manifests', path: '/orders/list?status=manifest' },
    ],
  },
  { text: 'NDR', icon: <TbTruckDelivery />, path: '/shipments/ndr', roles: ['customer', 'admin'] },
  {
    text: 'Billing',
    icon: <TbWallet />,
    path: '/billing/passbook',
    roles: ['customer', 'admin'],
    children: [
      { text: 'Passbook', path: '/billing/passbook' },
      { text: 'COD Remittance', path: '/billing/cod-remittance' },
      { text: 'Shipping Charges', path: '/billing/shipping-charges' },
      { text: 'All Recharges', path: '/billing/all-recharges' },
      { text: 'Invoices', path: '/billing/invoices' },
      { text: 'Credit Notes', path: '/billing/credit-notes' },
      { text: 'Debit Notes', path: '/billing/debit-notes' },
      { text: 'Ledgers', path: '/billing/ledgers' },
      { text: 'Notification Credit History', path: '/billing/notification-credit-history' },
    ],
  },
  {
    text: 'Tools',
    icon: <TbTool />,
    path: '/tools/rate-calculator',
    roles: ['customer', 'admin'],
    children: [
      { text: 'Rate Calculator', path: '/tools/rate-calculator' },
      { text: 'Shipment Price List', path: '/tools/shipment-price-list' },
      { text: 'Activity Logs', path: '/tools/activity-logs' },
      { text: 'Manage Courier', path: '/tools/courier-manage' },
      { text: 'Reports Download', path: '/tools/reports-download' },
      { text: 'Track Order', path: '/tools/track-order' },
      { text: 'Weight Discrepancy', path: '/tools/weight-discrepancy' },
    ],
  },
  {
    text: 'Reports',
    icon: <TbReportAnalytics />,
    path: '/reports/orders',
    roles: ['customer', 'admin'],
    children: [
      { text: 'Orders', path: '/reports/orders' },
      { text: 'Shipment', path: '/reports/shipment' },
      { text: 'NDR', path: '/reports/ndr' },
      { text: 'Custom Report', path: '/reports/custom-report' },
    ],
  },
  {
    text: 'Settings',
    icon: <TbSettings />,
    path: '/settings/shipping-notification',
    roles: ['customer', 'admin'],
    children: [
      { text: 'Shipping Notifications', path: '/settings/shipping-notification' },
      { text: 'COD Confirmation', path: '/settings/cod-confirmation' },
      { text: 'Early COD Subscription', path: '/settings/early-cod-subscription' },
      { text: 'Auto Assign Rules', path: '/settings/auto-assign-rules' },
      { text: 'Manage Label', path: '/settings/manage-label' },
      { text: 'Manage Invoice', path: '/settings/manage-invoice' },
      { text: 'Branded Tracking Page', path: '/settings/branded-tracking-page' },
    ],
  },
  { text: 'Warehouse', icon: <TbBuildingWarehouse />, path: '/warehouse', roles: ['customer', 'admin'] },
  {
    text: 'Integrations',
    icon: <TbPlugConnected />,
    path: '/integration/channels',
    roles: ['customer', 'admin'],
    children: [
      { text: 'Order Channels', path: '/integration/channels' },
      { text: 'OMS', path: '/integration/oms' },
      { text: 'EDD Widget', path: '/integration/edd-widget' },
      { text: 'API Integration', path: '/settings/api-integration' },
    ],
  },
  {
    text: 'Others',
    icon: <TbAlertCircle />,
    path: '/other/products',
    roles: ['customer', 'admin'],
    children: [
      { text: 'Products', path: '/other/products' },
      { text: 'Packaging', path: '/other/packaging' },
      { text: 'Customers', path: '/other/customers' },
      { text: 'Order Tags', path: '/other/order-tags' },
      { text: 'User Agreements', path: '/user-agreements' },
    ],
  },
]

function isActivePath(path: string, pathname: string) {
  const cleanPath = path.split('?')[0]
  if (cleanPath === '/dashboard') return pathname === '/dashboard' || pathname === '/home' || pathname.startsWith('/dashboard/')
  if (cleanPath === '/orders/new') return pathname.startsWith('/orders')
  return pathname === cleanPath || pathname.startsWith(`${cleanPath}/`)
}

export default function Sidebar({ role = 'customer', pinned = false, fixed = false, onMouseEnter, onMouseLeave }: SidebarProps) {
  const { pathname } = useLocation()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const isExpanded = pinned
  const sidebarWidth = isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH

  const filteredItems = useMemo(() => navItems.filter((item) => item.roles.includes(role)), [role])

  return (
    <Box
      sx={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100dvh',
        position: fixed ? 'fixed' : 'sticky',
        top: 0,
        left: fixed ? 0 : 'auto',
        bgcolor: '#fff',
        borderRight: `1px solid ${border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1200,
        transition: 'width 220ms ease, min-width 220ms ease',
        overflow: 'hidden',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Stack alignItems={isExpanded ? 'flex-start' : 'center'} justifyContent="center" sx={{ height: 112, px: isExpanded ? 2 : 0 }}>
        <Box
          component="img"
          src="/fastship-logo.png"
          alt="FastShip"
          sx={{
            width: isExpanded ? 150 : 78,
            height: isExpanded ? 64 : 58,
            objectFit: 'contain',
            objectPosition: 'center',
          }}
        />
      </Stack>

      <List
        sx={{
          flex: 1,
          minHeight: 0,
          px: isExpanded ? 1 : 0,
          py: 1.1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: '#b8c6d5 transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#b8c6d5', borderRadius: 10 },
        }}
      >
        {filteredItems.map((item) => {
          const active = isActivePath(item.path, pathname) || item.children?.some((child) => isActivePath(child.path, pathname))
          const hasChildren = Boolean(item.children?.length)

          return (
            <Box key={item.text}>
              <Tooltip title={isExpanded ? '' : item.text} placement="right">
                <ListItemButton
                  component={hasChildren ? 'button' : NavLink}
                  to={hasChildren ? undefined : item.path}
                  onClick={() => {
                    if (hasChildren && isExpanded) setExpandedItem(expandedItem === item.text ? null : item.text)
                  }}
                  sx={{
                    width: isExpanded ? '100%' : 54,
                    height: isExpanded ? 56 : 54,
                    mx: isExpanded ? 0 : 'auto',
                    mb: 0.72,
                    borderRadius: isExpanded ? '10px' : '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isExpanded ? 'flex-start' : 'center',
                    gap: 1.1,
                    color: active ? '#fff' : muted,
                    bgcolor: active ? teal : 'transparent',
                    border: '1px solid transparent',
                    '&:hover': {
                      bgcolor: active ? teal : '#eff7fb',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: isExpanded ? 32 : 0,
                      width: isExpanded ? 32 : 54,
                      height: isExpanded ? 32 : 54,
                      color: 'inherit',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 25,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {isExpanded && (
                    <>
                      <ListItemText
                        primary={item.text}
                        slotProps={{
                          primary: { sx: { color: 'inherit', fontSize: 14, fontWeight: active ? 800 : 600 } },
                        }}
                      />
                      {hasChildren && <TbChevronDown size={17} />}
                    </>
                  )}
                </ListItemButton>
              </Tooltip>

              {hasChildren && isExpanded && (
                <Collapse in={expandedItem === item.text || active} timeout="auto">
                  <List sx={{ pl: 4.4, py: 0.2 }}>
                    {item.children?.map((child) => {
                      const childActive = isActivePath(child.path, pathname)
                      return (
                        <ListItemButton
                          key={child.path}
                          component={NavLink}
                          to={child.path}
                          sx={{
                            minHeight: 36,
                            borderRadius: 1,
                            color: childActive ? teal : ink,
                            bgcolor: childActive ? '#e8f6fb' : 'transparent',
                            '&:hover': { bgcolor: '#eff7fb' },
                          }}
                        >
                          <ListItemText primary={child.text} slotProps={{ primary: { sx: { fontSize: 13, fontWeight: childActive ? 800 : 600 } } }} />
                        </ListItemButton>
                      )
                    })}
                  </List>
                </Collapse>
              )}
            </Box>
          )
        })}
      </List>

      <Stack alignItems="center" spacing={1} sx={{ pb: 3 }}>
        <Box
          sx={{
            minWidth: isExpanded ? 134 : 84,
            height: 32,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '6px',
            bgcolor: '#f2f5f8',
            color: ink,
            fontSize: 14,
          }}
        >
          Ctrl+ B
        </Box>
        <Box
          sx={{
            width: isExpanded ? '100%' : 112,
            minHeight: 92,
            display: 'grid',
            placeItems: 'center',
            bgcolor: '#fffef0',
          }}
        >
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: '#49b655',
              color: '#fff',
              fontSize: 29,
            }}
          >
            <TbLayoutSidebar />
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}
