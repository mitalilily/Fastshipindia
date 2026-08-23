import { alpha, Box, Card, CardActionArea, CardContent, Grid, Stack, Typography, useTheme } from '@mui/material'
import {
  TbAlertCircle,
  TbArrowUpRight,
  TbBuildingBank,
  TbCircleCheck,
  TbClock,
  TbPackage,
  TbTruckDelivery,
  TbWallet,
} from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { dashboardCardSx, dashboardPalette } from './dashboardStyles'

interface QuickStatsCardsProps {
  todayOps: {
    orders: number
    pending: number
    inTransit: number
    delivered: number
  }
  financial: {
    walletBalance: number
    codRemittanceDue: number
  }
  trends: {
    ordersGrowth: number
  }
  formatCurrency: (amount: number) => string
}

export default function QuickStatsCards({
  todayOps,
  financial,
  formatCurrency,
}: QuickStatsCardsProps) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const activeShipments = Number(todayOps.pending || 0) + Number(todayOps.inTransit || 0)
  const walletLow = Number(financial.walletBalance || 0) < 500
  const hasCodDue = Number(financial.codRemittanceDue || 0) > 0

  const stats = [
    {
      title: 'Active Shipments',
      value: activeShipments.toLocaleString('en-IN'),
      status: activeShipments > 0
        ? `${Number(todayOps.delivered || 0).toLocaleString('en-IN')} delivered today`
        : 'No active shipments',
      statusTone: activeShipments > 0 ? 'success' : 'neutral',
      icon: <TbPackage />,
      statusIcon: activeShipments > 0 ? <TbCircleCheck /> : <TbClock />,
      color: '#174EA6',
      action: 'View shipments',
      onClick: () => navigate('/orders/list'),
    },
    {
      title: 'In Transit',
      value: Number(todayOps.inTransit || 0).toLocaleString('en-IN'),
      status: Number(todayOps.pending || 0) > 0
        ? `${Number(todayOps.pending).toLocaleString('en-IN')} awaiting pickup`
        : 'Pickup queue is clear',
      statusTone: Number(todayOps.pending || 0) > 0 ? 'warning' : 'success',
      icon: <TbTruckDelivery />,
      statusIcon: Number(todayOps.pending || 0) > 0 ? <TbClock /> : <TbCircleCheck />,
      color: '#0F766E',
      action: 'Track orders',
      onClick: () => navigate('/orders/list'),
    },
    {
      title: 'Wallet Balance',
      value: formatCurrency(Number(financial.walletBalance || 0)),
      status: walletLow ? 'Low balance - Recharge now' : 'Balance ready for shipping',
      statusTone: walletLow ? 'danger' : 'success',
      icon: <TbWallet />,
      statusIcon: walletLow ? <TbAlertCircle /> : <TbCircleCheck />,
      color: '#C2410C',
      action: 'Manage wallet',
      onClick: () => navigate('/billing/passbook'),
    },
    {
      title: 'COD Remittance',
      value: formatCurrency(Number(financial.codRemittanceDue || 0)),
      status: hasCodDue ? 'Settlement is pending' : 'No remittance due',
      statusTone: hasCodDue ? 'warning' : 'success',
      icon: <TbBuildingBank />,
      statusIcon: hasCodDue ? <TbClock /> : <TbCircleCheck />,
      color: '#6D28D9',
      action: 'View remittances',
      onClick: () => navigate('/billing/cod-remittance'),
    },
  ]

  const statusStyles = {
    success: { color: '#15803D', background: alpha('#16A34A', isDark ? 0.17 : 0.09) },
    warning: { color: '#B45309', background: alpha('#F59E0B', isDark ? 0.18 : 0.11) },
    danger: { color: '#DC2626', background: alpha('#EF4444', isDark ? 0.18 : 0.09) },
    neutral: { color: dashboardPalette.muted, background: alpha('#64748B', isDark ? 0.17 : 0.08) },
  }

  return (
    <Grid container spacing={2} mb={2.5}>
      {stats.map((stat) => {
        const statusStyle = statusStyles[stat.statusTone as keyof typeof statusStyles]

        return (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.title}>
            <Card
              sx={{
                ...dashboardCardSx,
                minHeight: 164,
                borderColor: alpha(stat.color, isDark ? 0.28 : 0.14),
                background: dashboardPalette.surface,
                boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.16)' : '0 10px 28px rgba(15, 23, 42, 0.045)',
                transition: 'border-color 180ms ease, box-shadow 180ms ease',
                '&:hover': {
                  borderColor: alpha(stat.color, 0.32),
                  boxShadow: isDark ? '0 14px 32px rgba(0,0,0,0.2)' : '0 12px 32px rgba(15, 23, 42, 0.06)',
                },
              }}
            >
              <CardActionArea
                onClick={stat.onClick}
                aria-label={`${stat.title}: ${stat.value}. ${stat.action}`}
                sx={{
                  height: '100%',
                  minHeight: 164,
                  display: 'flex',
                  alignItems: 'stretch',
                  '&:focus-visible': {
                    outline: `3px solid ${alpha(stat.color, 0.28)}`,
                    outlineOffset: -3,
                  },
                }}
              >
                <CardContent sx={{ p: '18px !important', width: '100%' }}>
                  <Stack spacing={1.35} height="100%">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        sx={{
                          color: dashboardPalette.muted,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          letterSpacing: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {stat.title}
                      </Typography>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: '6px',
                          display: 'grid',
                          placeItems: 'center',
                          color: stat.color,
                          bgcolor: alpha(stat.color, isDark ? 0.14 : 0.055),
                          border: `1px solid ${alpha(stat.color, isDark ? 0.24 : 0.13)}`,
                          boxShadow: 'none',
                          '& svg': { width: 17, height: 17, strokeWidth: 1.8 },
                        }}
                      >
                        {stat.icon}
                      </Box>
                    </Stack>

                    <Typography
                      sx={{
                        color: dashboardPalette.ink,
                        fontSize: { xs: '1.62rem', lg: '1.48rem', xl: '1.62rem' },
                        fontWeight: 750,
                        lineHeight: 1,
                        letterSpacing: 0,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {stat.value}
                    </Typography>

                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" gap={1} mt="auto">
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.6}
                        sx={{
                          minWidth: 0,
                          px: 1,
                          py: 0.55,
                          borderRadius: '6px',
                          color: statusStyle.color,
                          bgcolor: statusStyle.background,
                        }}
                      >
                        <Box sx={{ display: 'grid', placeItems: 'center', flexShrink: 0, '& svg': { width: 14, height: 14 } }}>
                          {stat.statusIcon}
                        </Box>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 650, lineHeight: 1.2 }} noWrap>
                          {stat.status}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ color: stat.color, flexShrink: 0 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700 }}>{stat.action}</Typography>
                        <TbArrowUpRight size={15} />
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}
