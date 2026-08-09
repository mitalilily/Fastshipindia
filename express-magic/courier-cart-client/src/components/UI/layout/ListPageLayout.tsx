import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material'
import React from 'react'

export interface ListPageLayoutProps {
  title: string
  description: string
  children: React.ReactNode
  actions?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
    variant?: 'contained' | 'outlined'
  }[]
  controls?: React.ReactNode
  feedback?: {
    severity: 'info' | 'success' | 'error' | 'warning'
    title: string
    message: string
  } | null
  onClearFeedback?: () => void
  selectionInfo?: React.ReactNode
}

const ListPageLayout: React.FC<ListPageLayoutProps> = ({
  title,
  description,
  children,
  actions = [],
  controls,
  feedback,
  onClearFeedback,
  selectionInfo,
}) => {
  return (
    <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
      {/* Header Section */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        gap={2}
        sx={{ p: { xs: 0.5, sm: 1 }, minWidth: 0 }}
      >
        {/* Left Title Section */}
        <Stack spacing={0.3} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: '1.15rem', md: '1.35rem' },
              fontWeight: 800,
              color: '#111111',
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.88rem',
              color: '#6B7280',
              fontWeight: 500,
              lineHeight: 1.55,
              overflowWrap: 'anywhere',
            }}
          >
            {description}
          </Typography>
        </Stack>

        {/* Right Action Buttons */}
        {actions.length > 0 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            gap={1.25}
            width={{ xs: '100%', md: 'auto' }}
            flexWrap="wrap"
            useFlexGap
          >
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'contained'}
                color="primary"
                onClick={action.onClick}
                fullWidth={false}
                startIcon={action.icon}
                sx={{
                  minHeight: 42,
                  px: 2.2,
                  borderRadius: '12px',
                  fontWeight: 700,
                  textTransform: 'none',
                  ...(action.variant === 'outlined' && {
                    borderWidth: '1.5px',
                  }),
                  whiteSpace: 'nowrap',
                  width: { xs: '100%', sm: 'auto' },
                  flex: { sm: '0 0 auto' },
                }}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Controls Section */}
      {controls && <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>{controls}</Box>}

      {/* Feedback Alert */}
      {feedback && (
        <Alert
          severity={feedback.severity}
          onClose={onClearFeedback}
          sx={{ alignItems: 'flex-start' }}
        >
          <AlertTitle>{feedback.title}</AlertTitle>
          {feedback.message}
        </Alert>
      )}

      {/* Selection Info */}
      {selectionInfo && <Box sx={{ minWidth: 0, maxWidth: '100%' }}>{selectionInfo}</Box>}

      {/* Content */}
      {children}
    </Stack>
  )
}

export default ListPageLayout
