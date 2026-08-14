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
      status: walletLow ? 'Low balance · Recharge now' : 'Balance ready for shipping',
      statusTone: walletLow ? 'danger' : 'success',
      icon: <TbWallet />,
      statusIcon: walletLow ? <TbAlertCircle /> : <TbCircleCheck />,
      color: '#C2410C',
      action: 'Manage wallet',
      onClick: () => navigate('/billing/wallet_transactions'),
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
      onClick: () => navigate('/cod-remittance'),
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
                minHeight: 178,
                borderColor: alpha(stat.color, isDark ? 0.34 : 0.16),
                background: isDark
                  ? `linear-gradient(145deg, ${alpha(stat.color, 0.17)} 0%, ${dashboardPalette.surface} 58%)`
                  : `linear-gradient(145deg, ${alpha(stat.color, 0.075)} 0%, #ffffff 58%)`,
                boxShadow: isDark
                  ? '0 16px 36px rgba(0,0,0,0.18)'
                  : `0 14px 34px ${alpha(stat.color, 0.085)}`,
                transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  borderColor: alpha(stat.color, 0.42),
                  boxShadow: isDark
                    ? '0 20px 42px rgba(0,0,0,0.26)'
                    : `0 20px 42px ${alpha(stat.color, 0.14)}`,
                },
              }}
            >
              <CardActionArea
                onClick={stat.onClick}
                aria-label={`${stat.title}: ${stat.value}. ${stat.action}`}
                sx={{
                  height: '100%',
                  minHeight: 178,
                  display: 'flex',
                  alignItems: 'stretch',
                  '&:focus-visible': {
                    outline: `3px solid ${alpha(stat.color, 0.28)}`,
                    outlineOffset: -3,
                  },
                }}
              >
                <CardContent sx={{ p: '20px !important', width: '100%' }}>
                  <Stack spacing={1.5} height="100%">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        sx={{
                          color: dashboardPalette.muted,
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {stat.title}
                      </Typography>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: '13px',
                          display: 'grid',
                          placeItems: 'center',
                          color: stat.color,
                          bgcolor: alpha(stat.color, isDark ? 0.2 : 0.1),
                          border: `1px solid ${alpha(stat.color, isDark ? 0.35 : 0.18)}`,
                          boxShadow: `0 8px 20px ${alpha(stat.color, 0.1)}`,
                          '& svg': { width: 22, height: 22, strokeWidth: 1.8 },
                        }}
                      >
                        {stat.icon}
                      </Box>
                    </Stack>

                    <Typography
                      sx={{
                        color: dashboardPalette.ink,
                        fontSize: { xs: '1.8rem', lg: '1.65rem', xl: '1.8rem' },
                        fontWeight: 750,
                        lineHeight: 1,
                        letterSpacing: '-0.035em',
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
                          borderRadius: 999,
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
