import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import React from 'react'
import { IoArrowBack, IoCloseCircleOutline } from 'react-icons/io5'

interface GlassDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  width?: number | string
  anchor?: 'left' | 'right'
  showBackButton?: boolean
  backLabel?: string
  children: React.ReactNode
}

const CustomDrawer: React.FC<GlassDrawerProps> = ({
  open,
  onClose,
  title,
  width = 420,
  anchor = 'right',
  showBackButton = false,
  backLabel = 'Back',
  children,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      sx={{ zIndex: theme.zIndex.modal }}
      slotProps={{
        paper: {
          sx: {
            width: isMobile ? '100%' : width,
            maxWidth: '100vw',
            height: '100dvh',
            maxHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            color: theme.palette.text.primary,
            overflow: 'hidden',
            touchAction: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: `
              radial-gradient(circle at top left, ${alpha(theme.palette.primary.light, 0.2)} 0%, transparent 28%),
              radial-gradient(circle at top right, ${alpha(theme.palette.secondary.main, 0.16)} 0%, transparent 24%),
              linear-gradient(180deg, rgba(255, 251, 245, 0.98) 0%, rgba(255, 246, 236, 0.96) 100%)
            `,
            borderLeft: anchor === 'right' ? `1px solid ${alpha(theme.palette.primary.main, 0.12)}` : 'none',
            borderRight: anchor === 'left' ? `1px solid ${alpha(theme.palette.primary.main, 0.12)}` : 'none',
            boxShadow: `0 32px 72px ${alpha(theme.palette.text.primary, 0.16)}`,
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: { xs: 1.75, sm: 2.4 },
          py: { xs: 1.4, sm: 1.7 },
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: '0 auto auto 0',
            width: 120,
            height: 120,
            background: alpha(theme.palette.secondary.main, 0.18),
            filter: 'blur(44px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 'auto 0 0 auto',
            width: 140,
            height: 140,
            background: alpha(theme.palette.primary.light, 0.18),
            filter: 'blur(50px)',
          }}
        />

        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} position="relative" zIndex={1}>
          <Box sx={{ minWidth: 0 }}>
            {showBackButton && (
              <Button
                type="button"
                size="small"
                startIcon={<IoArrowBack />}
                onClick={onClose}
                sx={{
                  minWidth: 0,
                  px: 0,
                  mb: 0.5,
                  color: theme.palette.primary.main,
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: 'transparent', color: theme.palette.primary.dark },
                }}
              >
                {backLabel}
              </Button>
            )}
            <Typography
              sx={{
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                fontWeight: 800,
                color: theme.palette.text.secondary,
                mb: 0.25,
              }}
            >
              FastShip workspace
            </Typography>
            <Typography variant="h6" fontWeight={800} color={theme.palette.text.primary}>
              {title}
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            sx={{
              color: theme.palette.primary.main,
              backgroundColor: alpha('#ffffff', 0.7),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                transform: 'rotate(90deg)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <IoCloseCircleOutline size={24} />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ borderColor: alpha(theme.palette.primary.main, 0.08) }} />

      <Box
        p={{ xs: 1.5, sm: 2 }}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'auto',
          scrollbarGutter: 'stable',
          backgroundColor: alpha('#ffffff', 0.42),
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: alpha(theme.palette.primary.main, 0.05),
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(theme.palette.primary.main, 0.28),
            borderRadius: '999px',
          },
        }}
      >
        {children}
      </Box>
    </Drawer>
  )
}

export default CustomDrawer


