import { alpha, Box, Button, LinearProgress, Stack, Typography, useTheme } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  TbAlertTriangle,
  TbArrowRight,
  TbCalculator,
  TbChartBar,
  TbCheck,
  TbCreditCard,
  TbCube,
  TbPackage,
  TbPlus,
  TbRefresh,
  TbShieldCheck,
  TbTruckDelivery,
  TbWallet,
  TbX,
} from 'react-icons/tb'
import { useAuth } from '../../context/auth/AuthContext'
import { useMerchantDashboardStats } from '../../hooks/useDashboard'
import { useLabelPreferences } from '../../hooks/useLabelPreferences'
import { useMerchantReadiness } from '../../hooks/useMerchantReadiness'

const NAVY = '#0B3A78'
const RED = '#E31B23'
const PURPLE = NAVY
const ORANGE = RED
const BLUE = NAVY
const GREEN = NAVY

const toLocalDateInput = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatStatusLabel = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const getStatusColor = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized.includes('deliver')) return GREEN
  if (normalized.includes('transit') || normalized.includes('ship')) return BLUE
  if (normalized.includes('ndr') || normalized.includes('cancel')) return RED
  if (normalized.includes('rto') || normalized.includes('return')) return ORANGE
  return PURPLE
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)

export default function Home() {
  const navigate = useNavigate()
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { walletBalance, user, refetchUser } = useAuth()
  const { checklist } = useMerchantReadiness()
  const { preferences: labelPreferences } = useLabelPreferences()
  const dashboardDate = useMemo(() => toLocalDateInput(), [])
  const { data: dashboardStats, isLoading: dashboardLoading, isRefetching, refetch } =
    useMerchantDashboardStats(dashboardDate)
  const [showKycBanner, setShowKycBanner] = useState(true)
  const [isHomeRefreshing, setIsHomeRefreshing] = useState(false)
  const isDark = theme.palette.mode === 'dark'
  const pageBg = isDark ? '#0f141b' : '#f4f7fb'
  const cardBg = isDark ? '#151b23' : '#ffffff'
  const nestedCardBg = isDark ? '#0f141b' : '#f8fafc'
  const border = isDark ? '#2a313a' : alpha('#0f172a', 0.12)
  const strongBorder = isDark ? alpha('#ffffff', 0.86) : alpha(PURPLE, 0.34)
  const text = isDark ? '#f8fafc' : '#111827'
  const muted = isDark ? '#9badc3' : '#5b6b82'
  const dim = isDark ? '#7f8fa6' : '#64748b'
  const progressTrack = isDark ? '#2a313a' : alpha('#0f172a', 0.1)
  const emptyStepBorder = isDark ? '#2d3744' : alpha('#64748b', 0.36)
  const closeHoverBg = isDark ? alpha('#ffffff', 0.07) : alpha('#0f172a', 0.07)
  const cardSx = {
    border: `1px solid ${border}`,
    background: isDark
      ? 'linear-gradient(145deg, #171f29 0%, #121820 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #fbfcff 100%)',
    borderRadius: 3,
    boxShadow: isDark
      ? '0 18px 44px rgba(0, 0, 0, 0.18)'
      : '0 18px 42px rgba(45, 55, 85, 0.07)',
  }

  const displayName = user?.companyInfo?.contactPerson || user?.name || 'Sahil Mittal'
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])
  const formattedWalletBalance = `\u20B9${Number(walletBalance ?? 0).toLocaleString('en-IN')}`

  const statCards = useMemo(
    () => [
      {
        label: 'Orders Today',
        value: dashboardStats?.todayOperations?.orders,
        icon: <TbCube />,
        color: PURPLE,
        action: 'View orders',
        path: '/orders/list',
      },
      {
        label: 'In Transit',
        value: dashboardStats?.todayOperations?.inTransit,
        icon: <TbTruckDelivery />,
        color: BLUE,
        action: 'Track shipments',
        path: '/orders/list',
      },
      {
        label: 'NDR Pending',
        value: dashboardStats?.actions?.ndrCount,
        icon: <TbAlertTriangle />,
        color: RED,
        action: 'Resolve now',
        path: '/ops/ndr',
      },
      {
        label: 'RTO Active',
        value: dashboardStats?.actions?.rtoCount,
        icon: <TbRefresh />,
        color: ORANGE,
        action: 'Review returns',
        path: '/ops/rto',
      },
      {
        label: 'Wallet',
        value: formattedWalletBalance,
        icon: <TbWallet />,
        color: PURPLE,
        action: 'Recharge wallet',
        path: '/billing/passbook?recharge=true',
      },
    ],
    [dashboardStats, formattedWalletBalance],
  )

  const readinessByKey = useMemo(
    () => new Map(checklist.map((item) => [item.key, item])),
    [checklist],
  )

  const setupSteps = useMemo(
    () => [
      {
        title: 'Optional KYC',
        text: 'Add identity verification whenever you are ready',
        done: Boolean(readinessByKey.get('kyc')?.done),
        optional: true,
        path: '/profile/kyc_details',
      },
      {
        title: 'Company Profile',
        text: 'Add business details',
        done: Boolean(readinessByKey.get('company')?.done),
        path: '/profile/company',
      },
      {
        title: 'Bank Account',
        text: 'Required for COD payouts',
        done: Number(user?.bankDetails?.count || 0) > 0,
        path: '/profile/bank_details',
      },
      {
        title: 'Pickup Address',
        text: 'Set up warehouse location',
        done: Boolean(readinessByKey.get('pickup')?.done),
        path: '/settings/manage_pickups',
      },
      {
        title: 'Label Config',
        text: 'Customize shipping labels',
        done: Boolean(labelPreferences?.id),
        path: '/settings/label_config',
      },
    ],
    [labelPreferences?.id, readinessByKey, user?.bankDetails?.count],
  )

  const profileProgress = Math.round(
    (setupSteps.filter((step) => !step.optional && step.done).length /
      setupSteps.filter((step) => !step.optional).length) *
      100,
  )

  const statusBreakdown = dashboardStats?.charts?.ordersByStatus || []
  const statusTotal = statusBreakdown.reduce((total, item) => total + Number(item.count || 0), 0)
  const maxStatusCount = Math.max(1, ...statusBreakdown.map((item) => Number(item.count || 0)))
  const recentOrders = dashboardStats?.recentActivity?.recentOrders?.slice(0, 4) || []

  const handleRefreshHome = useCallback(async () => {
    setIsHomeRefreshing(true)
    try {
      await Promise.allSettled([
        refetch(),
        Promise.resolve(refetchUser()),
        queryClient.invalidateQueries({ queryKey: ['walletBalance'] }),
        queryClient.invalidateQueries({ queryKey: ['pickupAddresses'] }),
        queryClient.invalidateQueries({ queryKey: ['labelPreferences'] }),
        queryClient.invalidateQueries({ queryKey: ['paymentOptions'] }),
        queryClient.invalidateQueries({ queryKey: ['client-notifications'] }),
      ])
    } finally {
      setIsHomeRefreshing(false)
    }
  }, [queryClient, refetch, refetchUser])

  const quickActions = [
    { title: 'Create Order', text: 'Ship a new package', icon: <TbPlus />, color: PURPLE, path: '/orders/create' },
    { title: 'All Orders', text: 'View all shipments', icon: <TbTruckDelivery />, color: BLUE, path: '/orders/list' },
    { title: 'NDR Actions', text: 'Handle failed deliveries', icon: <TbRefresh />, color: RED, path: '/ops/ndr' },
    { title: 'COD Remittance', text: 'Track COD payouts', icon: <TbCreditCard />, color: RED, path: '/billing/cod-remittance' },
    { title: 'Rate Calculator', text: 'Compare courier rates', icon: <TbCalculator />, color: NAVY, path: '/tools/rate_calculator' },
    { title: 'Analytics', text: 'Shipping insights', icon: <TbChartBar />, color: PURPLE, path: '/dashboard' },
  ]

  return (
    <Box sx={{ bgcolor: pageBg, color: text, width: '100%', minWidth: 0, minHeight: '100%', overflowX: 'hidden', pb: 4 }}>
      <Stack spacing={{ xs: 2.5, md: 1.5 }}>
        {showKycBanner && !readinessByKey.get('kyc')?.done ? (
          <Box
            sx={{
              ...cardSx,
              minHeight: { xs: 88, md: 68 },
              px: { xs: 1.75, md: 2 },
              py: { xs: 1.5, md: 1 },
              pr: { xs: 5, md: 5 },
              borderColor: strongBorder,
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) auto' },
              gap: { xs: 1.25, lg: 2 },
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              background: isDark
                ? `linear-gradient(120deg, ${alpha(ORANGE, 0.13)} 0%, ${cardBg} 48%, ${alpha(PURPLE, 0.1)} 100%)`
                : `linear-gradient(120deg, ${alpha(ORANGE, 0.09)} 0%, #ffffff 48%, ${alpha(PURPLE, 0.07)} 100%)`,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
              <Box sx={{ color: ORANGE, display: 'grid', placeItems: 'center' }}>
                <TbShieldCheck size={22} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: ORANGE, fontWeight: 700, fontSize: { xs: '0.96rem', md: '0.88rem' } }}>
                  Optional KYC Verification
                </Typography>
                <Typography sx={{ color: dim, fontWeight: 500, fontSize: { xs: '0.82rem', md: '0.76rem' }, lineHeight: 1.45 }}>
                  Add verification details whenever convenient. You can continue using the panel without it.
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              endIcon={<TbArrowRight />}
              onClick={() => navigate('/profile/kyc_details')}
              sx={{
                justifySelf: { xs: 'start', lg: 'end' },
                bgcolor: PURPLE,
                color: '#ffffff',
                borderRadius: 2,
                px: 2,
                py: 0.8,
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'none',
                '&:hover': { bgcolor: '#072B5B' },
              }}
            >
              Add KYC Details
            </Button>
            <Box
              component="button"
              type="button"
              aria-label="Dismiss KYC reminder"
              onClick={() => setShowKycBanner(false)}
              sx={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 26,
                height: 26,
                border: 0,
                borderRadius: '50%',
                bgcolor: 'transparent',
                color: dim,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                '&:hover': { color: text, bgcolor: closeHoverBg },
              }}
            >
              <TbX size={18} />
            </Box>
          </Box>
        ) : null}

        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.25,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: text, fontSize: { xs: '1.35rem', md: '1.18rem' }, fontWeight: 700 }}>
              {greeting}, {displayName}!
            </Typography>
            <Typography sx={{ color: muted, mt: 0.2, fontSize: { xs: '0.9rem', md: '0.8rem' } }}>
              Here's your daily overview.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<TbRefresh size={17} />}
            onClick={handleRefreshHome}
            disabled={isHomeRefreshing || isRefetching}
            sx={{
              borderRadius: 1.5,
              minHeight: 36,
              px: 1.6,
              color: PURPLE,
              borderColor: alpha(PURPLE, 0.28),
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: isDark ? alpha(PURPLE, 0.08) : '#ffffff',
              '&:hover': {
                borderColor: alpha(PURPLE, 0.48),
                bgcolor: alpha(PURPLE, isDark ? 0.12 : 0.05),
              },
            }}
          >
            {isHomeRefreshing || isRefetching ? 'Refreshing' : 'Refresh'}
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(5, minmax(0, 1fr))',
            },
            gap: { xs: 1.5, md: 1.1 },
          }}
        >
          {statCards.map((item) => (
            <Box
              component="button"
              type="button"
              key={item.label}
              onClick={() => navigate(item.path)}
              sx={{
                ...cardSx,
                minHeight: { xs: 104, md: 82 },
                p: { xs: 1.75, md: 1.25 },
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                color: text,
                textAlign: 'left',
                font: 'inherit',
                cursor: 'pointer',
                borderColor: alpha(item.color, isDark ? 0.32 : 0.19),
                background: isDark
                  ? `linear-gradient(145deg, ${alpha(item.color, 0.13)} 0%, ${cardBg} 58%)`
                  : `linear-gradient(145deg, ${alpha(item.color, 0.075)} 0%, #ffffff 56%)`,
                boxShadow: isDark
                  ? `0 18px 38px ${alpha('#000000', 0.2)}`
                  : `0 16px 34px ${alpha(item.color, 0.09)}`,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  bgcolor: item.color,
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  width: 94,
                  height: 94,
                  right: -38,
                  top: -48,
                  borderRadius: '50%',
                  bgcolor: alpha(item.color, isDark ? 0.14 : 0.08),
                  pointerEvents: 'none',
                },
                transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  borderColor: alpha(item.color, 0.44),
                  boxShadow: isDark
                    ? `0 22px 48px ${alpha('#000000', 0.28)}`
                    : `0 22px 44px ${alpha(item.color, 0.14)}`,
                },
                '&:focus-visible': {
                  outline: `3px solid ${alpha(item.color, 0.24)}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                <Box>
                  <Typography sx={{ color: dim, fontWeight: 500, fontSize: { xs: '0.88rem', md: '0.78rem' } }}>{item.label}</Typography>
                  <Typography
                    sx={{ color: text, fontSize: { xs: '1.55rem', md: '1.24rem' }, lineHeight: 1.1, fontWeight: 700 }}
                  >
                    {dashboardLoading && item.label !== 'Wallet'
                      ? '—'
                      : typeof item.value === 'number'
                        ? item.value.toLocaleString('en-IN')
                        : item.value ?? '0'}
                  </Typography>
                  <Typography sx={{ color: item.color, mt: 0.6, fontWeight: 600, fontSize: '0.68rem' }}>
                    {item.action} {'\u2192'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2.2,
                    display: 'grid',
                    placeItems: 'center',
                    color: item.color,
                    bgcolor: alpha(item.color, isDark ? 0.17 : 0.11),
                    border: `1px solid ${alpha(item.color, 0.14)}`,
                    '& svg': { width: 18, height: 18 },
                  }}
                >
                  {item.icon}
                </Box>
              </Stack>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            ...cardSx,
            borderColor: alpha(PURPLE, isDark ? 0.28 : 0.18),
            p: { xs: 1.75, md: 1.5 },
            position: 'relative',
            overflow: 'hidden',
            background: isDark
              ? `linear-gradient(135deg, ${alpha(PURPLE, 0.1)} 0%, ${cardBg} 44%, ${alpha(ORANGE, 0.06)} 100%)`
              : `linear-gradient(135deg, ${alpha(PURPLE, 0.055)} 0%, #ffffff 44%, ${alpha(ORANGE, 0.045)} 100%)`,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={{ xs: 1.8, md: 1.2 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2.2,
                  display: 'grid',
                  placeItems: 'center',
                  color: PURPLE,
                  bgcolor: alpha(PURPLE, 0.11),
                  border: `1px solid ${alpha(PURPLE, 0.14)}`,
                }}
              >
                <TbShieldCheck size={18} />
              </Box>
              <Typography sx={{ color: text, fontWeight: 700, fontSize: '0.95rem' }}>
                Complete Your Profile
              </Typography>
            </Stack>
            <Typography
              sx={{
                color: PURPLE,
                fontWeight: 700,
                px: 1,
                py: 0.35,
                fontSize: '0.75rem',
                borderRadius: 999,
                bgcolor: alpha(PURPLE, 0.1),
                border: `1px solid ${alpha(PURPLE, 0.12)}`,
              }}
            >
              {profileProgress}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={profileProgress}
            sx={{
              height: 7,
              borderRadius: 999,
              bgcolor: progressTrack,
              mb: { xs: 2, md: 1.3 },
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                background: `linear-gradient(90deg, ${PURPLE} 0%, ${BLUE} 50%, ${ORANGE} 100%)`,
                boxShadow: `0 0 14px ${alpha(PURPLE, 0.28)}`,
              },
            }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
                xl: 'repeat(5, minmax(0, 1fr))',
              },
              gap: 0.9,
            }}
          >
            {setupSteps.map((step) => (
              <Box
                component="button"
                type="button"
                key={step.title}
                onClick={() => navigate(step.path)}
                sx={{
                  minHeight: { xs: 62, md: 52 },
                  p: { xs: 1.4, md: 1 },
                  borderRadius: 2,
                  width: '100%',
                  border: `1px solid ${step.done ? alpha(GREEN, 0.26) : border}`,
                  background: step.done
                    ? alpha(GREEN, isDark ? 0.1 : 0.055)
                    : isDark
                      ? alpha('#ffffff', 0.025)
                      : alpha('#ffffff', 0.72),
                  color: text,
                  font: 'inherit',
                  textAlign: 'left',
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: step.done ? alpha(GREEN, 0.48) : alpha(PURPLE, 0.34),
                    boxShadow: `0 12px 26px ${alpha(step.done ? GREEN : PURPLE, 0.08)}`,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: `2px solid ${step.done ? GREEN : emptyStepBorder}`,
                    bgcolor: step.done ? GREEN : 'transparent',
                    color: '#ffffff',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {step.done ? <TbCheck size={15} strokeWidth={3} /> : null}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      color: step.done ? alpha(text, 0.6) : text,
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      textDecoration: step.done ? 'line-through' : 'none',
                    }}
                    noWrap
                  >
                    {step.title}
                  </Typography>
                  <Typography sx={{ color: muted, fontSize: '0.7rem' }} noWrap>
                    {step.text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '0.9fr 1.85fr' }, gap: 1.5 }}>
          <Box
            sx={{
              ...cardSx,
              minHeight: { xs: 246, md: 205 },
              p: { xs: 2, md: 1.5 },
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1.4} alignItems="center">
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    color: PURPLE,
                    bgcolor: alpha(PURPLE, 0.1),
                  }}
                >
                  <TbChartBar size={17} />
                </Box>
                <Typography sx={{ color: text, fontWeight: 700, fontSize: '0.95rem' }}>
                  Orders by Status
                </Typography>
              </Stack>
              <Typography
                sx={{
                  color: muted,
                  px: 1.1,
                  py: 0.4,
                  borderRadius: 999,
                  bgcolor: alpha(PURPLE, 0.07),
                  fontSize: '0.7rem',
                }}
              >
                {statusTotal.toLocaleString('en-IN')} total
              </Typography>
            </Stack>
            {statusTotal > 0 ? (
              <Stack spacing={1.25} sx={{ mt: 2.2 }}>
                {statusBreakdown.slice(0, 5).map((item) => {
                  const itemColor = getStatusColor(item.status)
                  const count = Number(item.count || 0)
                  return (
                    <Box key={item.status}>
                      <Stack direction="row" justifyContent="space-between" mb={0.6}>
                        <Typography sx={{ color: muted, fontSize: '0.78rem', fontWeight: 500 }}>
                          {formatStatusLabel(item.status)}
                        </Typography>
                        <Typography sx={{ color: text, fontSize: '0.78rem', fontWeight: 700 }}>
                          {count.toLocaleString('en-IN')}
                        </Typography>
                      </Stack>
                      <Box sx={{ height: 7, borderRadius: 999, bgcolor: progressTrack, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.max(6, (count / maxStatusCount) * 100)}%`,
                            borderRadius: 999,
                            background: `linear-gradient(90deg, ${itemColor}, ${alpha(itemColor, 0.6)})`,
                          }}
                        />
                      </Box>
                    </Box>
                  )
                })}
              </Stack>
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: { xs: 170, md: 142 } }}>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    color: PURPLE,
                    bgcolor: alpha(PURPLE, 0.08),
                    border: `1px solid ${alpha(PURPLE, 0.12)}`,
                    boxShadow: `0 12px 26px ${alpha(PURPLE, 0.09)}`,
                  }}
                >
                  <TbPackage size={23} />
                </Box>
                <Typography sx={{ color: text, mt: 1.3, fontWeight: 600 }}>No orders yet</Typography>
                <Typography sx={{ color: muted, mt: 0.35, fontSize: '0.78rem' }}>
                  Status insights will appear after your first booking.
                </Typography>
              </Stack>
            )}
          </Box>

          <Box sx={{ ...cardSx, p: { xs: 2, md: 1.5 }, overflow: 'hidden', minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography sx={{ color: text, fontWeight: 700, fontSize: '0.95rem' }}>
                Quick Actions
              </Typography>
              <Typography sx={{ color: muted, fontSize: '0.76rem' }}>Shortcuts</Typography>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 0.9,
              }}
            >
              {quickActions.map((item) => (
                <Box
                  component="button"
                  type="button"
                  key={item.title}
                  onClick={() => navigate(item.path)}
                  sx={{
                    minHeight: { xs: 70, md: 58 },
                    p: { xs: 1.4, md: 1 },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderRadius: 2,
                    width: '100%',
                    border: `1px solid ${alpha(item.color, isDark ? 0.23 : 0.14)}`,
                    background: isDark
                      ? `linear-gradient(135deg, ${alpha(item.color, 0.1)} 0%, ${nestedCardBg} 72%)`
                      : `linear-gradient(135deg, ${alpha(item.color, 0.065)} 0%, ${nestedCardBg} 72%)`,
                    color: text,
                    font: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: alpha(item.color, 0.48),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 12px 26px ${alpha(item.color, 0.1)}`,
                    },
                    '&:focus-visible': {
                      outline: `3px solid ${alpha(item.color, 0.2)}`,
                      outlineOffset: 2,
                    },
                    transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 36, md: 30 },
                      height: { xs: 36, md: 30 },
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: alpha(item.color, 0.13),
                      color: item.color,
                      flexShrink: 0,
                      '& svg': { width: 18, height: 18 },
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: text, fontWeight: 600, fontSize: '0.82rem' }} noWrap>
                      {item.title}
                    </Typography>
                    <Typography sx={{ color: muted, fontSize: '0.72rem' }} noWrap>
                      {item.text}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            ...cardSx,
            minHeight: { xs: 360, md: 300 },
            p: { xs: 2, md: 1.5 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ color: text, fontWeight: 700, fontSize: '0.95rem' }}>
              Recent Orders
            </Typography>
            <Typography onClick={() => navigate('/orders/list')} sx={{ color: PURPLE, fontWeight: 600, cursor: 'pointer' }}>
              View all {'\u2192'}
            </Typography>
          </Stack>
          {recentOrders.length ? (
            <Stack spacing={1.05} sx={{ mt: 2 }}>
              {recentOrders.map((order) => {
                const orderColor = getStatusColor(order.status || 'pending')
                return (
                  <Box
                    component="button"
                    type="button"
                    key={order.id}
                    onClick={() => navigate('/orders/list')}
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr auto', sm: '1.2fr 1fr auto' },
                      gap: 1.5,
                      alignItems: 'center',
                      p: 1.35,
                      borderRadius: 2,
                      border: `1px solid ${alpha(orderColor, isDark ? 0.22 : 0.13)}`,
                      bgcolor: alpha(orderColor, isDark ? 0.07 : 0.035),
                      color: text,
                      font: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'transform 180ms ease, border-color 180ms ease',
                      '&:hover': { transform: 'translateX(3px)', borderColor: alpha(orderColor, 0.38) },
                    }}
                  >
                    <Stack direction="row" spacing={1.1} alignItems="center" minWidth={0}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          color: orderColor,
                          bgcolor: alpha(orderColor, 0.11),
                          flexShrink: 0,
                        }}
                      >
                        <TbCube size={18} />
                      </Box>
                      <Box minWidth={0}>
                        <Typography sx={{ color: text, fontWeight: 600, fontSize: '0.86rem' }} noWrap>
                          {order.orderNumber || 'Order'}
                        </Typography>
                        <Typography sx={{ color: muted, fontSize: '0.72rem' }} noWrap>
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Recently created'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography
                      sx={{
                        display: { xs: 'none', sm: 'block' },
                        color: orderColor,
                        fontSize: '0.76rem',
                        fontWeight: 600,
                      }}
                    >
                      {formatStatusLabel(order.status || 'pending')}
                    </Typography>
                    <Typography sx={{ color: text, fontWeight: 700, fontSize: '0.84rem' }}>
                      {formatCurrency(Number(order.amount || 0))}
                    </Typography>
                  </Box>
                )
              })}
            </Stack>
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: { xs: 278, md: 220 } }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: PURPLE,
                  bgcolor: alpha(PURPLE, 0.08),
                  border: `1px solid ${alpha(PURPLE, 0.13)}`,
                  boxShadow: `0 16px 34px ${alpha(PURPLE, 0.1)}`,
                }}
              >
                <TbCube size={25} />
              </Box>
              <Typography sx={{ color: text, mt: 1.5, fontWeight: 700, fontSize: '0.92rem' }}>
                No orders yet
              </Typography>
              <Typography sx={{ color: muted, mt: 0.7, textAlign: 'center' }}>
                Create your first order to start shipping.
              </Typography>
              <Button
                variant="contained"
                startIcon={<TbPlus />}
                onClick={() => navigate('/orders/create')}
                sx={{
                  mt: 2.2,
                  bgcolor: NAVY,
                  borderLeft: `3px solid ${RED}`,
                  color: '#ffffff',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.6,
                  boxShadow: `0 12px 26px ${alpha(PURPLE, 0.24)}`,
                  '&:hover': {
                    bgcolor: '#072B5B',
                    boxShadow: `0 16px 32px ${alpha(PURPLE, 0.3)}`,
                  },
                }}
              >
                Create Order
              </Button>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
