import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { dashboardIconSx, dashboardPalette } from './dashboardStyles'

interface DashboardWidgetHeaderProps {
  icon: ReactNode
  title: string
  subtitle: string
  color?: string
  action?: ReactNode
}

export default function DashboardWidgetHeader({
  icon,
  title,
  subtitle,
  color = dashboardPalette.blue,
  action,
}: DashboardWidgetHeaderProps) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={1.5}
      sx={{ minWidth: 0 }}
    >
      <Stack direction="row" spacing={1.15} alignItems="center" sx={{ minWidth: 0 }}>
        <Box sx={dashboardIconSx(color)}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              color: dashboardPalette.ink,
              fontSize: { xs: '0.92rem', md: '0.98rem' },
              fontWeight: 800,
              lineHeight: 1.18,
            }}
            noWrap
          >
            {title}
          </Typography>
          <Typography
            sx={{
              color: dashboardPalette.muted,
              fontSize: { xs: '0.72rem', md: '0.76rem' },
              fontWeight: 500,
              mt: 0.25,
              lineHeight: 1.3,
            }}
            noWrap
          >
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Stack>
  )
}
