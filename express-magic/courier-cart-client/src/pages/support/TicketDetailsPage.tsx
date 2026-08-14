import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { MdArrowBack, MdSend } from 'react-icons/md'
import { useNavigate, useParams } from 'react-router-dom'
import StatusChip from '../../components/UI/chip/StatusChip'
import {
  useReplyToTicket,
  useTicketById,
  useTicketMessages,
} from '../../hooks/User/useSupport'

const statusColorMap: Record<string, 'success' | 'pending' | 'error' | 'info'> = {
  open: 'info',
  in_progress: 'pending',
  resolved: 'success',
  closed: 'error',
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

const labelize = (value = '') =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())

export const TicketDetailsPage = () => {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reply, setReply] = useState('')
  const [replyError, setReplyError] = useState('')

  const { data: ticket, isLoading } = useTicketById(id)
  const { data: messages = [], isLoading: areMessagesLoading } = useTicketMessages(id)
  const replyMutation = useReplyToTicket(id)

  const sendReply = async () => {
    const message = reply.trim()
    if (!message) return
    setReplyError('')
    try {
      await replyMutation.mutateAsync(message)
      setReply('')
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Reply could not be sent.')
    }
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (!ticket) {
    return (
      <Stack spacing={2}>
        <Typography variant="h6">Ticket not found</Typography>
        <Button variant="contained" onClick={() => navigate('/support/tickets')}>
          Back to Tickets
        </Button>
      </Stack>
    )
  }

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 1100, mx: 'auto', width: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Button
            startIcon={<MdArrowBack />}
            onClick={() => navigate('/support/tickets')}
            sx={{ mb: 1, px: 0 }}
          >
            Back to tickets
          </Button>
          <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap">
            <Typography variant="h5" fontWeight={800}>{ticket.subject}</Typography>
            <StatusChip label={labelize(ticket.status)} status={statusColorMap[ticket.status]} />
          </Stack>
          <Typography variant="caption" color="text.secondary">Ticket #{ticket.id}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Chip label={`${labelize(ticket.category)} · ${labelize(ticket.subcategory)}`} />
          {ticket.awbNumber ? <Chip label={`AWB ${ticket.awbNumber}`} variant="outlined" /> : null}
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f8fafc' }}>
          <Typography variant="overline" color="text.secondary">Original issue</Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {ticket.description}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Submitted {formatDate(ticket.createdAt)}
          </Typography>
        </Box>

        <Divider />

        <Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, minHeight: 180 }}>
          <Typography variant="subtitle1" fontWeight={800}>Conversation</Typography>
          {areMessagesLoading ? (
            <Stack alignItems="center" py={3}><CircularProgress size={24} /></Stack>
          ) : messages.length ? (
            messages.map((message) => {
              const isSupport = message.senderRole === 'admin'
              return (
                <Stack
                  key={message.id}
                  direction="row"
                  spacing={1.2}
                  justifyContent={isSupport ? 'flex-start' : 'flex-end'}
                  alignItems="flex-start"
                >
                  {isSupport ? <Avatar sx={{ width: 34, height: 34, bgcolor: '#0B3A78' }}>FS</Avatar> : null}
                  <Box sx={{ maxWidth: '82%' }}>
                    <Stack direction="row" spacing={1} justifyContent={isSupport ? 'flex-start' : 'flex-end'}>
                      <Typography variant="caption" fontWeight={700}>
                        {isSupport ? 'FastShip Support' : 'You'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(message.createdAt)}
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        mt: 0.5,
                        px: 1.7,
                        py: 1.2,
                        bgcolor: isSupport ? '#eef4ff' : '#0B3A78',
                        color: isSupport ? '#0f172a' : '#fff',
                        borderRadius: isSupport ? '4px 16px 16px' : '16px 4px 16px 16px',
                      }}
                    >
                      <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                        {message.message}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              )
            })
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
              No replies yet. Our support team will respond here.
            </Typography>
          )}
        </Stack>

        <Divider />

        <Stack spacing={1.2} sx={{ p: { xs: 2, md: 3 } }}>
          {replyError ? <Alert severity="error">{replyError}</Alert> : null}
          <TextField
            multiline
            minRows={3}
            value={reply}
            onChange={(event) => setReply(event.target.value.slice(0, 4000))}
            placeholder="Write a reply to FastShip Support..."
            disabled={replyMutation.isPending}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') sendReply()
            }}
          />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Ctrl + Enter to send · {reply.length}/4000
            </Typography>
            <Button
              variant="contained"
              endIcon={<MdSend />}
              onClick={sendReply}
              disabled={!reply.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? 'Sending...' : 'Send reply'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}

export default TicketDetailsPage
