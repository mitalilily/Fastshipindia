import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import { MdDoneAll, MdNotifications } from 'react-icons/md'
import { useAuth } from '../../context/auth/AuthContext'
import { useClientNotifications } from '../../hooks/useClientNotifications'

const formatNotificationTime = (value?: string | null) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const theme = useTheme()
  const { isAuthenticated } = useAuth()
  const {
    data: notifications = [],
    isLoading,
    markRead,
    markAllRead,
    markingAllRead,
  } = useClientNotifications(isAuthenticated)
  const isDark = theme.palette.mode === 'dark'
  const surface = isDark ? '#151b23' : '#ffffff'
  const borderColor = isDark ? alpha('#f8fafc', 0.12) : alpha('#0f172a', 0.1)
  const textColor = isDark ? '#f8fafc' : '#11182d'
  const mutedColor = isDark ? '#93a4ba' : '#64748b'
  const accent = '#E31B23'
  const unreadCount = notifications.filter((notification) => !(notification.read ?? notification.isRead)).length

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          gap={1.4}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha(accent, isDark ? 0.16 : 0.1),
                  color: accent,
                }}
              >
                <MdNotifications size={24} />
              </Box>
              <Box>
                <Typography sx={{ color: textColor, fontWeight: 800, fontSize: { xs: '1.45rem', md: '1.9rem' } }}>
                  Notifications
                </Typography>
                <Typography sx={{ color: mutedColor, fontWeight: 600, fontSize: '0.9rem' }}>
                  {unreadCount ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Button
            variant="contained"
            startIcon={<MdDoneAll />}
            disabled={!unreadCount || markingAllRead}
            onClick={() => markAllRead()}
            sx={{
              minHeight: 38,
              borderRadius: 1.4,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#0B3A78',
              '&:hover': { bgcolor: '#082d5d' },
            }}
          >
            Mark all read
          </Button>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: surface,
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? 'none' : '0 18px 38px rgba(15, 23, 42, 0.08)',
          }}
        >
          {isLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 260 }}>
              <CircularProgress size={28} sx={{ color: accent }} />
              <Typography sx={{ mt: 1.2, color: mutedColor, fontWeight: 600 }}>
                Loading notifications...
              </Typography>
            </Stack>
          ) : notifications.length ? (
            <Stack divider={<Divider sx={{ borderColor }} />}>
              {notifications.map((notification) => {
                const unread = !(notification.read ?? notification.isRead)
                const time = formatNotificationTime(notification.createdAt)

                return (
                  <Box
                    key={notification.id}
                    component="button"
                    type="button"
                    onClick={() => {
                      if (unread) markRead(notification.id)
                    }}
                    style={{
                      border: 0,
                      width: '100%',
                      textAlign: 'left',
                      cursor: unread ? 'pointer' : 'default',
                      background: 'transparent',
                      font: 'inherit',
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                      gap={1.5}
                      sx={{
                        px: { xs: 1.8, md: 2.3 },
                        py: 1.7,
                        bgcolor: unread ? alpha(accent, isDark ? 0.12 : 0.06) : surface,
                        '&:hover': {
                          bgcolor: unread ? alpha(accent, isDark ? 0.16 : 0.08) : alpha('#0B3A78', isDark ? 0.08 : 0.04),
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.35} sx={{ minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            mt: 0.55,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: unread ? accent : alpha(mutedColor, 0.35),
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                            <Typography sx={{ color: textColor, fontWeight: unread ? 800 : 650, fontSize: '0.98rem' }}>
                              {notification.title || 'Notification'}
                            </Typography>
                            {unread ? (
                              <Chip
                                label="Unread"
                                size="small"
                                sx={{
                                  height: 22,
                                  color: accent,
                                  bgcolor: alpha(accent, 0.1),
                                  fontWeight: 800,
                                  '& .MuiChip-label': { px: 0.8, fontSize: '0.68rem' },
                                }}
                              />
                            ) : null}
                          </Stack>
                          <Typography sx={{ color: mutedColor, mt: 0.45, lineHeight: 1.55, fontSize: '0.9rem' }}>
                            {notification.message}
                          </Typography>
                        </Box>
                      </Stack>

                      {time ? (
                        <Typography
                          sx={{
                            color: mutedColor,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            pl: { xs: 3.1, sm: 0 },
                          }}
                        >
                          {time}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          ) : (
            <Stack alignItems="center" textAlign="center" sx={{ px: 3, py: 7 }}>
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha('#0B3A78', isDark ? 0.18 : 0.08),
                  color: mutedColor,
                }}
              >
                <MdNotifications size={32} />
              </Box>
              <Typography sx={{ mt: 1.4, color: textColor, fontWeight: 800, fontSize: '1.1rem' }}>
                No notifications yet
              </Typography>
              <Typography sx={{ mt: 0.55, color: mutedColor, fontSize: '0.9rem' }}>
                New order and shipment updates will appear here.
              </Typography>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  )
}
