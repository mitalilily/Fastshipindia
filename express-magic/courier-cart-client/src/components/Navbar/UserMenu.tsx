import { Avatar, Box, Button, IconButton, Popover, Stack, Typography } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { MdLogout, MdOutlineAccountCircle, MdOutlineMail, MdOutlinePhone, MdSupportAgent, MdViewModule } from 'react-icons/md'
import { TbApiApp } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth/AuthContext'
import { usePresignedDownloadUrls } from '../../hooks/Uploads/usePresignedDownloadUrls'

const SHIPMOZO_BLUE = '#0789ad'
const INK = '#2f3747'
const MUTED = '#334155'

export const getInitials = (fullName?: string) => {
  if (!fullName) return 'M'

  const parts = fullName.trim().split(/\s+/)
  const firstInitial = parts[0]?.[0] ?? ''
  const lastInitial = parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''

  return `${firstInitial}${lastInitial}`.toUpperCase()
}

const UserMenu = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const { data: avatarUrl } = usePresignedDownloadUrls({
    keys: user?.companyInfo?.profilePicture,
    enabled: !!user?.companyInfo?.profilePicture,
  })

  const displayName =
    user?.companyInfo?.contactPerson ||
    user?.companyInfo?.businessName ||
    user?.companyInfo?.brandName ||
    'SHRAVAN KUMAR MAHTO'
  const roleLabel = user?.role ? user.role.toUpperCase() : 'ADMIN'
  const email = user?.companyInfo?.contactEmail || user?.companyInfo?.companyEmail || 'rikaenterprises98@gmail.com'
  const phone = user?.companyInfo?.contactNumber || user?.companyInfo?.companyContactNumber || '8285681158'
  const initials = getInitials(displayName)

  const handleClose = () => setAnchorEl(null)

  const goTo = (path: string) => {
    handleClose()
    navigate(path)
  }

  return (
    <Box>
      <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ p: 0.2 }}>
        {avatarUrl && !Array.isArray(avatarUrl) ? (
          <Avatar alt={displayName} src={avatarUrl} sx={avatarSx} />
        ) : (
          <Avatar sx={avatarSx}>{initials}</Avatar>
        )}
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: profilePaperSx } }}
      >
        <Box sx={{ px: 2.6, py: 1.8, borderBottom: '1px solid #e5ebf2' }}>
          <Typography sx={{ color: INK, fontSize: 18, fontWeight: 900 }}>User Profile</Typography>
        </Box>

        <Box sx={{ p: 2.4 }}>
          <Stack direction="row" spacing={1.8} alignItems="center" sx={{ mb: 2.8 }}>
            {avatarUrl && !Array.isArray(avatarUrl) ? (
              <Avatar alt={displayName} src={avatarUrl} sx={{ width: 88, height: 88, bgcolor: SHIPMOZO_BLUE, fontSize: 38 }} />
            ) : (
              <Avatar sx={{ width: 88, height: 88, bgcolor: SHIPMOZO_BLUE, color: '#fff', fontSize: 38 }}>{initials}</Avatar>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: INK, fontSize: 14, fontWeight: 900, textTransform: 'uppercase' }}>{displayName}</Typography>
              <Typography sx={{ color: INK, fontSize: 14, fontWeight: 700, mt: 0.5 }}>{roleLabel}</Typography>
              <Stack direction="row" spacing={0.7} alignItems="center" sx={{ mt: 0.7 }}>
                <MdOutlineMail size={17} />
                <Typography sx={{ color: MUTED, fontSize: 14 }}>{email}</Typography>
              </Stack>
              <Stack direction="row" spacing={0.7} alignItems="center" sx={{ mt: 0.45 }}>
                <MdOutlinePhone size={17} />
                <Typography sx={{ color: MUTED, fontSize: 14 }}>{phone}</Typography>
              </Stack>
            </Box>
          </Stack>

          <Stack spacing={1.45}>
            <ProfileRow icon={<MdOutlineAccountCircle size={27} />} title="My Profile" subtitle="Account Settings" onClick={() => goTo('/profile')} />
            <ProfileRow icon={<MdSupportAgent size={27} />} title="Support" subtitle="Contact Support" onClick={() => goTo('/support')} />
            <ProfileRow icon={<MdViewModule size={27} />} title="Terms & Conditions / SOP" subtitle="Read Our Terms & Conditions" onClick={() => goTo('/user-agreements')} />
            <ProfileRow icon={<TbApiApp size={27} />} title="API Documentation" subtitle="Check our latest API Documentation" onClick={() => goTo('/settings/api-integration')} />
          </Stack>

          <Button
            fullWidth
            startIcon={<MdLogout size={22} />}
            onClick={() => {
              logout()
              handleClose()
            }}
            sx={{
              mt: 3.4,
              height: 40,
              borderRadius: '10px',
              border: `1px solid ${SHIPMOZO_BLUE}`,
              color: SHIPMOZO_BLUE,
              bgcolor: '#fff',
              textTransform: 'none',
              fontWeight: 900,
              '&:hover': { bgcolor: '#eff9fc' },
            }}
          >
            Logout
          </Button>
        </Box>
      </Popover>
    </Box>
  )
}

interface ProfileRowProps {
  icon: ReactNode
  title: string
  subtitle: string
  onClick: () => void
}

function ProfileRow({ icon, title, subtitle, onClick }: ProfileRowProps) {
  return (
    <Button
      onClick={onClick}
      fullWidth
      sx={{
        justifyContent: 'flex-start',
        gap: 1.6,
        p: 0,
        color: INK,
        textAlign: 'left',
        textTransform: 'none',
        borderRadius: '10px',
        '&:hover': { bgcolor: '#f7fafc' },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '12px',
          display: 'grid',
          placeItems: 'center',
          color: '#7778ff',
          bgcolor: '#f2f6fb',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: INK, fontSize: 14, fontWeight: 900, lineHeight: 1.2 }}>{title}</Typography>
        <Typography sx={{ color: MUTED, fontSize: 14, fontWeight: 500, mt: 0.65, lineHeight: 1.25 }}>{subtitle}</Typography>
      </Box>
    </Button>
  )
}

const avatarSx = {
  width: { xs: 34, sm: 40 },
  height: { xs: 34, sm: 40 },
  bgcolor: SHIPMOZO_BLUE,
  color: '#fff',
  border: '2px solid #f1f5f9',
  boxShadow: '0 0 0 2px #0b1f36',
  fontSize: 18,
}

const profilePaperSx = {
  mt: 1,
  width: 450,
  borderRadius: '10px',
  border: '1px solid #e5ebf2',
  bgcolor: '#fff',
  color: INK,
  boxShadow: '0 20px 42px rgba(15, 23, 42, 0.12)',
  overflow: 'hidden',
}

export default UserMenu
