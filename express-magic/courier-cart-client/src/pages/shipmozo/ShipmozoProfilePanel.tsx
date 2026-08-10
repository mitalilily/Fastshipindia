import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  TbBox,
  TbBuildingBank,
  TbCamera,
  TbCheck,
  TbCircleCheck,
  TbCopy,
  TbEdit,
  TbEye,
  TbFileText,
  TbKey,
  TbLock,
  TbLogout,
  TbMapPin,
  TbRefresh,
  TbShieldCheck,
  TbTruckDelivery,
  TbUpload,
  TbUserCircle,
  TbWallet,
  TbX,
} from 'react-icons/tb'
import { useLocation, useNavigate } from 'react-router-dom'
import { logoutOtherDevicesApi } from '../../api/auth'
import { uploadFileToStorage } from '../../api/upload.api'
import { useAuth } from '../../context/auth/AuthContext'
import { useUpdateUserProfile } from '../../hooks/User/useUpdateUserProfile'
import type { CompanyInfo, IUserProfileDB } from '../../types/user.types'
import PasswordSettingsForm from '../../components/user/profile/PasswordSettings'
import { toast } from '../../components/UI/Toast'
import { isDemoLoginEnabled } from '../../utils/demoAuth'

const teal = '#0789ad'
const ink = '#071d35'
const border = '#dbe4ee'
const head = '#e9eff5'
const page = '#f4f7fb'
const coral = '#ff8067'

type ProfileTab = 'profile' | 'documents' | 'password' | 'security' | 'other-details'

const profileTabs: Array<{ id: ProfileTab; label: string; icon: ReactNode }> = [
  { id: 'profile', label: 'My Profile', icon: <TbUserCircle size={22} /> },
  { id: 'documents', label: 'Documents', icon: <TbFileText size={22} /> },
  { id: 'password', label: 'Change Password', icon: <TbLock size={22} /> },
  { id: 'security', label: 'Security', icon: <TbShieldCheck size={22} /> },
  { id: 'other-details', label: 'Other Details', icon: <TbBox size={22} /> },
]

const transporterRows = [
  ['XpressBees B2B', '27AAGCB3904P2ZC'],
  ['Ekart B2B', '07AADCI8374D2ZH'],
  ['Movin B2B', '88AAFCI7460Q1ZW'],
  ['Bluedart B2B', '27AAACB0446L1ZS'],
  ['TCI Express B2B', '06AADCT0663J4Z9'],
  ['Delhivery B2B', '06AAPCS9575E1ZR'],
]

const documentDefinitions = [
  { id: 'gst', label: 'GST Certificate/Company Incorporated Document', demoAvailable: true },
  { id: 'selfie', label: 'Photo or selfie', demoAvailable: false },
  { id: 'pan', label: 'PAN Card/Driving License', demoAvailable: true },
  { id: 'identity', label: 'Aadhaar Card/Passport/Voter ID Card', demoAvailable: true },
] as const

type DocumentId = (typeof documentDefinitions)[number]['id']
type DocumentRecord = { fileName: string; url: string; mimeType: string }
type DocumentState = Partial<Record<DocumentId, DocumentRecord>>
type EditSection = 'contact' | 'address' | null

const cardSx = {
  bgcolor: '#fff',
  border: `1px solid ${border}`,
  borderRadius: '8px',
  overflow: 'hidden',
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '7px',
    bgcolor: '#fff',
    '& fieldset': { borderColor: border },
    '&:hover fieldset': { borderColor: '#b8c7d8' },
    '&.Mui-focused fieldset': { borderColor: teal, borderWidth: 1 },
  },
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FS'

const readStoredDocuments = (storageKey: string): DocumentState => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}') as DocumentState
    return Object.fromEntries(
      Object.entries(stored).filter(([, document]) => document?.url && !document.url.startsWith('blob:')),
    ) as DocumentState
  } catch {
    return {}
  }
}

export default function ShipmozoProfilePanel() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const navigate = useNavigate()
  const { user, walletBalance, refetchUser, setTokens } = useAuth()
  const { mutateAsync: updateProfile, isPending: profileSaving } = useUpdateUserProfile()
  const routeTab = location.pathname.split('/')[2] || ''
  const requestedTab = (routeTab === 'change-password' ? 'password' : routeTab) as ProfileTab
  const activeTab = profileTabs.some((tab) => tab.id === requestedTab) ? requestedTab! : 'profile'
  const company = user.companyInfo
  const displayName = company.contactPerson || company.businessName || company.brandName || 'FastShip Merchant'
  const displayRole = String(user.role || 'merchant').toUpperCase()
  const documentStorageKey = `fastship_profile_documents_${user.id || 'demo'}`
  const [editSection, setEditSection] = useState<EditSection>(null)
  const [profilePicture, setProfilePicture] = useState(company.profilePicture || '')
  const [draft, setDraft] = useState<CompanyInfo>({ ...company })
  const [documents, setDocuments] = useState<DocumentState>(() => readStoredDocuments(documentStorageKey))
  const [activeDocument, setActiveDocument] = useState<(typeof documentDefinitions)[number] | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState<DocumentId | null>(null)
  const [transporterOpen, setTransporterOpen] = useState(false)
  const [securityConfirmOpen, setSecurityConfirmOpen] = useState(false)
  const [securitySaving, setSecuritySaving] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [publicKey, setPublicKey] = useState(() => `FS${(user.id || 'DEMO2026').replace(/-/g, '').slice(0, 18)}`)
  const profilePhotoInput = useRef<HTMLInputElement | null>(null)
  const documentInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (company.profilePicture) setProfilePicture(company.profilePicture)
  }, [company.profilePicture])

  useEffect(() => {
    setDocuments(readStoredDocuments(documentStorageKey))
  }, [documentStorageKey])

  useEffect(() => {
    const persistentDocuments = Object.fromEntries(
      Object.entries(documents).filter(([, document]) => document?.url && !document.url.startsWith('blob:')),
    )
    localStorage.setItem(documentStorageKey, JSON.stringify(persistentDocuments))
  }, [documentStorageKey, documents])

  const primaryBank = user.bankDetails?.primaryAccount
  const profileRows = useMemo(
    () => ({
      contact: [
        ['Name', displayName],
        ['Email', company.contactEmail || company.companyEmail || '--'],
        ['Phone', company.contactNumber || company.companyContactNumber || '--'],
        ['User type', user.businessType?.join(', ').toUpperCase() || displayRole],
        ['Joined', formatDate(user.submittedAt)],
      ],
      address: [
        ['Address Line 1', company.companyAddress || '--'],
        ['City', company.city || '--'],
        ['State', company.state || '--'],
        ['Country', 'India'],
        ['Pincode', company.pincode || '--'],
        ['Company name', company.businessName || '--'],
        ['Store name', company.brandName || '--'],
        ['GSTIN', user.gstDetails?.gstNumber || '--'],
      ],
      bank: [
        ['Bank Name', primaryBank?.bankName || '--'],
        ['Account Holder Name', primaryBank?.accountHolder || '--'],
        ['Account Number', primaryBank?.accountNumber || '--'],
        ['IFSC', primaryBank?.ifsc || '--'],
        ['Branch Name', primaryBank?.branch || '--'],
      ],
    }),
    [company, displayName, displayRole, primaryBank, user],
  )

  const changeTab = (tab: ProfileTab) => {
    const path = tab === 'profile' ? '/profile' : `/profile/${tab === 'password' ? 'change-password' : tab}`
    navigate(path)
  }

  const openEditor = (section: Exclude<EditSection, null>) => {
    setDraft({ ...company })
    setEditSection(section)
  }

  const saveEditor = async () => {
    try {
      await updateProfile({ companyInfo: { ...company, ...draft } } as Partial<IUserProfileDB>)
      setEditSection(null)
      refetchUser()
    } catch {
      // The mutation displays the API error toast.
    }
  }

  const handleProfilePicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.open({ message: 'Please choose an image file.', severity: 'error' })
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.open({ message: 'Profile image must be under 3 MB.', severity: 'error' })
      return
    }

    const preview = URL.createObjectURL(file)
    setProfilePicture(preview)

    if (isDemoLoginEnabled()) {
      toast.open({ message: 'Profile photo updated for this demo session.', severity: 'success' })
      return
    }

    try {
      const uploaded = await uploadFileToStorage(file, `profile/${user.id || 'demo'}/avatar`)
      await updateProfile({ companyInfo: { ...company, profilePicture: uploaded.url } } as Partial<IUserProfileDB>)
      setProfilePicture(uploaded.url)
    } catch {
      if (isDemoLoginEnabled()) {
        toast.open({ message: 'Profile photo updated for this demo session.', severity: 'success' })
      } else {
        setProfilePicture(company.profilePicture || '')
        toast.open({ message: 'Profile photo upload failed.', severity: 'error' })
      }
    }
  }

  const requestDocumentUpload = (id: DocumentId) => {
    setUploadingDocument(id)
    documentInput.current?.click()
  }

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || !uploadingDocument) return
    if (file.size > 5 * 1024 * 1024) {
      toast.open({ message: 'Document must be under 5 MB.', severity: 'error' })
      return
    }

    if (isDemoLoginEnabled()) {
      setDocuments((current) => ({
        ...current,
        [uploadingDocument]: {
          fileName: file.name,
          url: URL.createObjectURL(file),
          mimeType: file.type,
        },
      }))
      toast.open({ message: `${file.name} added to this demo session.`, severity: 'success' })
      setUploadingDocument(null)
      return
    }

    try {
      const uploaded = await uploadFileToStorage(file, `profile/${user.id || 'demo'}/documents`)
      setDocuments((current) => ({
        ...current,
        [uploadingDocument]: {
          fileName: uploaded.originalName,
          url: uploaded.url,
          mimeType: uploaded.mime,
        },
      }))
      toast.open({ message: `${file.name} uploaded successfully.`, severity: 'success' })
    } catch {
      if (isDemoLoginEnabled()) {
        setDocuments((current) => ({
          ...current,
          [uploadingDocument]: {
            fileName: file.name,
            url: URL.createObjectURL(file),
            mimeType: file.type,
          },
        }))
        toast.open({ message: `${file.name} added to this demo session.`, severity: 'success' })
      } else {
        toast.open({ message: 'Document upload failed. Please try again.', severity: 'error' })
      }
    } finally {
      setUploadingDocument(null)
    }
  }

  const viewDocument = (definition: (typeof documentDefinitions)[number]) => {
    const uploaded = documents[definition.id]
    if (uploaded?.url) {
      window.open(uploaded.url, '_blank', 'noopener,noreferrer')
      return
    }
    setActiveDocument(definition)
  }

  const rotatePublicKey = () => {
    const next = `FS${crypto.randomUUID().replace(/-/g, '').slice(0, 18).toUpperCase()}`
    setPublicKey(next)
    toast.open({ message: 'Demo API key rotated.', severity: 'success' })
  }

  const revokeOtherSessions = async () => {
    setSecuritySaving(true)
    try {
      const result = await logoutOtherDevicesApi()
      setTokens(result.accessToken, result.refreshToken, user)
      toast.open({ message: 'Other active devices have been logged out.', severity: 'success' })
      setSecurityConfirmOpen(false)
    } catch {
      if (isDemoLoginEnabled()) {
        localStorage.setItem('fastship_other_sessions_revoked_at', new Date().toISOString())
        toast.open({ message: 'Other demo browser sessions have been cleared.', severity: 'success' })
        setSecurityConfirmOpen(false)
      } else {
        toast.open({ message: 'Could not logout other devices. Please try again.', severity: 'error' })
      }
    } finally {
      setSecuritySaving(false)
    }
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 68px)', bgcolor: page, pb: 2 }}>
      <input ref={profilePhotoInput} hidden type="file" accept="image/*" onChange={handleProfilePicture} />
      <input ref={documentInput} hidden type="file" accept="image/*,.pdf" onChange={handleDocumentUpload} />

      <ProfileHeader
        displayName={displayName}
        displayRole={displayRole}
        profilePicture={profilePicture}
        approved={user.approved}
        walletBalance={walletBalance}
        onPhotoClick={() => profilePhotoInput.current?.click()}
      />

      <Box sx={{ px: { xs: 1, md: 2 }, mt: 0 }}>
        <Stack
          direction="row"
          sx={{ bgcolor: head, overflowX: 'auto', border: `1px solid ${border}`, borderRadius: '8px' }}
        >
          {profileTabs.map((tab) => (
            <Button
              key={tab.id}
              startIcon={tab.icon}
              onClick={() => changeTab(tab.id)}
              sx={{
                minWidth: { xs: 150, md: 154 },
                height: 62,
                px: 2,
                color: activeTab === tab.id ? teal : ink,
                borderBottom: activeTab === tab.id ? `2px solid ${teal}` : '2px solid transparent',
                borderRadius: 0,
                textTransform: 'none',
                fontWeight: activeTab === tab.id ? 900 : 700,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Stack>

        <Box sx={{ mt: 2 }}>
          {activeTab === 'profile' && (
            <MyProfileTab
              rows={profileRows}
              approved={user.approved}
              kycStatus={user.domesticKyc?.status || 'pending'}
              publicKey={publicKey}
              showPrivateKey={showPrivateKey}
              onTogglePrivateKey={() => setShowPrivateKey((current) => !current)}
              onCopyPublicKey={() => {
                navigator.clipboard.writeText(publicKey)
                toast.open({ message: 'Public key copied.', severity: 'success' })
              }}
              onRotatePublicKey={rotatePublicKey}
              onEditContact={() => openEditor('contact')}
              onEditAddress={() => openEditor('address')}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              documents={documents}
              gstDocumentUrl={user.gstDetails?.documentUrl || ''}
              onRefresh={() => {
                refetchUser()
                toast.open({ message: 'Document list refreshed.', severity: 'success' })
              }}
              onUpload={requestDocumentUpload}
              onView={viewDocument}
            />
          )}
          {activeTab === 'password' && (
            <Box sx={{ maxWidth: 620, mx: 'auto', pb: 2 }}>
              <PasswordSettingsForm />
            </Box>
          )}
          {activeTab === 'security' && (
            <SecurityTab onLogoutOtherDevices={() => setSecurityConfirmOpen(true)} />
          )}
          {activeTab === 'other-details' && (
            <OtherDetailsTab onOpenTransporters={() => setTransporterOpen(true)} />
          )}
        </Box>
      </Box>

      <ProfileEditDialog
        section={editSection}
        draft={draft}
        saving={profileSaving}
        onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
        onClose={() => setEditSection(null)}
        onSave={saveEditor}
      />
      <TransporterDialog open={transporterOpen} onClose={() => setTransporterOpen(false)} />
      <DocumentPreviewDialog document={activeDocument} onClose={() => setActiveDocument(null)} />
      <Dialog open={securityConfirmOpen} onClose={() => setSecurityConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, color: ink }}>Logout other devices?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#405066' }}>
            Other active FastShip browser sessions will be invalidated. Your current session will stay signed in.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSecurityConfirmOpen(false)} sx={{ color: ink, textTransform: 'none' }}>Cancel</Button>
          <Button disabled={securitySaving} onClick={revokeOtherSessions} sx={{ bgcolor: coral, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#ed6d55' } }}>
            {securitySaving ? 'Logging out...' : 'Logout other devices'}
          </Button>
        </DialogActions>
      </Dialog>

      <Footer compact={isMobile} />
    </Box>
  )
}

function ProfileHeader({
  displayName,
  displayRole,
  profilePicture,
  approved,
  walletBalance,
  onPhotoClick,
}: {
  displayName: string
  displayRole: string
  profilePicture: string
  approved: boolean
  walletBalance: number | null
  onPhotoClick: () => void
}) {
  return (
    <Box sx={{ bgcolor: '#fff' }}>
      <Box
        sx={{
          height: { xs: 100, md: 134 },
          backgroundColor: '#d8f2ef',
          backgroundImage:
            'radial-gradient(circle at 12% 115%, rgba(60,190,205,.44) 0 18%, transparent 19%), radial-gradient(circle at 85% -30%, rgba(211,126,220,.4) 0 31%, transparent 32%), linear-gradient(112deg, #dff5b8 0%, #b9ecdf 48%, #f2c8ea 100%)',
        }}
      />
      <Box sx={{ minHeight: { xs: 250, md: 147 }, position: 'relative', px: 3, pb: 2 }}>
        <Stack alignItems="center" sx={{ mt: { xs: -56, md: -70 } }}>
          <Box
            sx={{
              width: { xs: 110, md: 132 },
              height: { xs: 110, md: 132 },
              borderRadius: '50%',
              bgcolor: '#1f1f1f',
              border: '6px solid #fff',
              outline: '5px solid #e45d78',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              overflow: 'hidden',
            }}
          >
            {profilePicture ? (
              <Box component="img" src={profilePicture} alt={displayName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Typography sx={{ fontSize: 38, fontWeight: 800 }}>{getInitials(displayName)}</Typography>
            )}
          </Box>
          <Tooltip title="Update profile photo">
            <IconButton
              onClick={onPhotoClick}
              aria-label="Update profile photo"
              sx={{ mt: -3.7, ml: 14, bgcolor: '#eef4f8', color: teal, border: '3px solid #fff', '&:hover': { bgcolor: '#dcecf4' } }}
            >
              <TbCamera size={19} />
            </IconButton>
          </Tooltip>
          <Typography sx={{ mt: 0.7, fontSize: 18, fontWeight: 900, color: ink, textAlign: 'center' }}>{displayName}</Typography>
          <Typography sx={{ fontSize: 15, color: ink }}>{displayRole}</Typography>
        </Stack>

        <Stack
          alignItems="center"
          sx={{ position: { xs: 'static', md: 'absolute' }, left: { md: '17%' }, top: { md: 38 }, mt: { xs: 2, md: 0 }, color: ink }}
        >
          <TbWallet size={24} />
          <Typography sx={{ mt: 0.4, fontSize: 21, fontWeight: 900 }}>
            {'\u20B9'} {Number(walletBalance ?? 269.75).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography>Wallet</Typography>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.4}
          justifyContent="center"
          sx={{ position: { xs: 'static', md: 'absolute' }, right: { md: '10%' }, top: { md: 57 }, mt: { xs: 1.5, md: 0 } }}
        >
          <Typography sx={{ fontWeight: 900, color: ink }}>Profile Status:</Typography>
          <StatusPill approved={approved} />
        </Stack>
      </Box>
    </Box>
  )
}

function StatusPill({ approved }: { approved: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ px: 1.3, height: 40, bgcolor: approved ? '#13c7a6' : coral, color: '#fff', borderRadius: '20px', fontWeight: 900 }}>
      <TbCircleCheck size={20} />
      <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{approved ? 'Approved' : 'Pending'}</Typography>
    </Stack>
  )
}

function DetailCard({ title, icon, rows, onEdit }: { title: string; icon: ReactNode; rows: string[][]; onEdit?: () => void }) {
  return (
    <Box sx={cardSx}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${border}` }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon}
          <Typography sx={{ color: ink, fontSize: 18, fontWeight: 900 }}>{title}</Typography>
        </Stack>
        {onEdit && (
          <Tooltip title={`Edit ${title.toLowerCase()}`}>
            <IconButton onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`} sx={{ width: 40, height: 40, bgcolor: head, color: teal }}>
              <TbEdit size={19} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: '16px 28px' }}>
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ minWidth: 0 }}>
            <Typography sx={{ color: '#66758a', fontSize: 12, fontWeight: 700 }}>{label}</Typography>
            <Typography sx={{ color: ink, fontSize: 14, fontWeight: 800, mt: 0.35, overflowWrap: 'anywhere' }}>{value}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function MyProfileTab({
  rows,
  approved,
  kycStatus,
  publicKey,
  showPrivateKey,
  onTogglePrivateKey,
  onCopyPublicKey,
  onRotatePublicKey,
  onEditContact,
  onEditAddress,
}: {
  rows: { contact: string[][]; address: string[][]; bank: string[][] }
  approved: boolean
  kycStatus: string
  publicKey: string
  showPrivateKey: boolean
  onTogglePrivateKey: () => void
  onCopyPublicKey: () => void
  onRotatePublicKey: () => void
  onEditContact: () => void
  onEditAddress: () => void
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 500px' }, gap: 2 }}>
      <Stack spacing={2}>
        <DetailCard title="Contact Details" icon={<TbUserCircle size={22} />} rows={rows.contact} onEdit={onEditContact} />
        <DetailCard title="Address Details" icon={<TbMapPin size={22} />} rows={rows.address} onEdit={onEditAddress} />
        <DetailCard title="Bank Details" icon={<TbBuildingBank size={22} />} rows={rows.bank} />
      </Stack>
      <Stack spacing={2}>
        <Box sx={cardSx}>
          <Typography sx={{ p: 2, borderBottom: `1px solid ${border}`, fontSize: 18, fontWeight: 900, color: ink }}>KYC using Aadhaar</Typography>
          <Stack spacing={2} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><b>KYC Status</b><StatusPill approved={approved || kycStatus === 'verified'} /></Stack>
            <Stack direction="row" justifyContent="space-between"><b>Verification state</b><b>{kycStatus.replace(/_/g, ' ')}</b></Stack>
          </Stack>
        </Box>
        <Box sx={cardSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: `1px solid ${border}` }}>
            <Stack direction="row" spacing={1} alignItems="center"><TbKey size={22} /><Typography sx={{ fontSize: 18, fontWeight: 900, color: ink }}>API Details</Typography></Stack>
            <Button startIcon={<TbRefresh />} onClick={onRotatePublicKey} sx={{ bgcolor: teal, color: '#fff', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#057899' } }}>Rotate Key</Button>
          </Stack>
          <Stack spacing={2} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <b>Private Key</b>
              <Stack direction="row" alignItems="center" minWidth={0}>
                <Typography sx={{ color: '#00a69a', fontWeight: 900, overflowWrap: 'anywhere' }}>{showPrivateKey ? 'fastship-private-demo-key' : 'xxxxxxxxxxxxxxxx'}</Typography>
                <Tooltip title={showPrivateKey ? 'Hide private key' : 'Show private key'}><IconButton onClick={onTogglePrivateKey}><TbEye /></IconButton></Tooltip>
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <b>Public Key</b>
              <Stack direction="row" alignItems="center" minWidth={0}>
                <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{publicKey}</Typography>
                <Tooltip title="Copy public key"><IconButton onClick={onCopyPublicKey}><TbCopy /></IconButton></Tooltip>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

function DocumentsTab({
  documents,
  gstDocumentUrl,
  onRefresh,
  onUpload,
  onView,
}: {
  documents: DocumentState
  gstDocumentUrl: string
  onRefresh: () => void
  onUpload: (id: DocumentId) => void
  onView: (definition: (typeof documentDefinitions)[number]) => void
}) {
  return (
    <Box sx={cardSx}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
        <Typography sx={{ color: ink, fontSize: 18, fontWeight: 800 }}>Upload / View Documents</Typography>
        <Tooltip title="Refresh documents"><IconButton onClick={onRefresh} sx={{ width: 46, height: 46, bgcolor: head, color: ink }}><TbRefresh size={22} /></IconButton></Tooltip>
      </Stack>
      <TableContainer>
        <Table sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: head }}>
              <TableCell sx={{ color: ink, fontWeight: 900, fontSize: 15 }}>Name</TableCell>
              <TableCell sx={{ color: ink, fontWeight: 900, fontSize: 15 }}>Document</TableCell>
              <TableCell align="center" sx={{ color: ink, fontWeight: 900, fontSize: 15, width: 230 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documentDefinitions.map((definition) => {
              const uploaded = documents[definition.id]
              const hasProfileDocument = definition.id === 'gst' && Boolean(gstDocumentUrl)
              const available = Boolean(uploaded || hasProfileDocument || definition.demoAvailable)
              return (
                <TableRow key={definition.id} hover>
                  <TableCell sx={{ color: ink, fontWeight: 700 }}>
                    {definition.label} <Box component="span" sx={{ color: '#ed1c24' }}>*</Box>
                  </TableCell>
                  <TableCell sx={{ color: '#65748a' }}>{uploaded?.fileName || (available ? 'Available' : '--')}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {available && (
                        <Button startIcon={<TbEye />} onClick={() => hasProfileDocument ? window.open(gstDocumentUrl, '_blank', 'noopener,noreferrer') : onView(definition)} sx={{ bgcolor: teal, color: '#fff', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#057899' } }}>View</Button>
                      )}
                      <Button startIcon={<TbUpload />} onClick={() => onUpload(definition.id)} sx={{ bgcolor: available ? head : teal, color: available ? ink : '#fff', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: available ? '#dce5ef' : '#057899' } }}>
                        {available ? 'Replace' : 'Upload'}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

function SecurityTab({ onLogoutOtherDevices }: { onLogoutOtherDevices: () => void }) {
  return (
    <Box sx={{ ...cardSx, maxWidth: 880 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2} sx={{ p: 2.5 }}>
        <Box>
          <Typography sx={{ color: ink, fontSize: 17, fontWeight: 900 }}>Logout other devices</Typography>
          <Typography sx={{ color: '#405066', fontSize: 14, mt: 0.5 }}>Logout from all other active browser sessions</Typography>
        </Box>
        <Button startIcon={<TbLogout />} onClick={onLogoutOtherDevices} sx={{ bgcolor: coral, color: '#fff', textTransform: 'none', fontWeight: 900, px: 2.2, height: 42, '&:hover': { bgcolor: '#ed6d55' } }}>Logout</Button>
      </Stack>
    </Box>
  )
}

function OtherDetailsTab({ onOpenTransporters }: { onOpenTransporters: () => void }) {
  return (
    <Box sx={{ ...cardSx, minHeight: 410, p: 2 }}>
      <Button onClick={onOpenTransporters} startIcon={<TbTruckDelivery size={26} />} sx={{ width: { xs: '100%', sm: 388 }, height: 72, justifyContent: 'flex-start', px: 2.5, border: `1px solid ${border}`, color: ink, bgcolor: '#fff', boxShadow: '0 3px 8px rgba(7,29,53,.1)', textTransform: 'none', fontSize: 16, '&:hover': { bgcolor: '#f8fbfd' } }}>
        Transporter Info
      </Button>
    </Box>
  )
}

function ProfileEditDialog({ section, draft, saving, onChange, onClose, onSave }: { section: EditSection; draft: CompanyInfo; saving: boolean; onChange: (key: keyof CompanyInfo, value: string) => void; onClose: () => void; onSave: () => void }) {
  const fields: Array<{ key: keyof CompanyInfo; label: string }> = section === 'contact'
    ? [
        { key: 'contactPerson', label: 'Contact name' },
        { key: 'contactEmail', label: 'Contact email' },
        { key: 'contactNumber', label: 'Contact phone' },
        { key: 'website', label: 'Website' },
      ]
    : [
        { key: 'companyAddress', label: 'Company address' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'pincode', label: 'Pincode' },
        { key: 'businessName', label: 'Company name' },
        { key: 'brandName', label: 'Store name' },
      ]

  return (
    <Dialog open={Boolean(section)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: ink, fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Edit {section === 'contact' ? 'contact details' : 'address details'}
        <IconButton onClick={onClose}><TbX /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, pt: 0.5 }}>
          {fields.map((field) => (
            <TextField key={field.key} label={field.label} value={String(draft[field.key] || '')} onChange={(event) => onChange(field.key, event.target.value)} fullWidth size="small" sx={fieldSx} />
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: ink, textTransform: 'none' }}>Cancel</Button>
        <Button onClick={onSave} disabled={saving} sx={{ bgcolor: teal, color: '#fff', textTransform: 'none', minWidth: 100, '&:hover': { bgcolor: '#057899' } }}>{saving ? 'Saving...' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  )
}

function TransporterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '8px' } }}>
      <DialogTitle sx={{ color: ink, fontSize: 24, fontWeight: 900, textAlign: 'center', pt: 3 }}>Transporter Info</DialogTitle>
      <DialogContent sx={{ px: { xs: 1.5, sm: 5 }, pb: 2 }}>
        <TableContainer sx={{ border: `1px solid ${border}` }}>
          <Table size="small">
            <TableHead><TableRow><TableCell sx={{ fontWeight: 900, color: ink }}>Name</TableCell><TableCell sx={{ fontWeight: 900, color: ink }}>Transporter ID</TableCell></TableRow></TableHead>
            <TableBody>{transporterRows.map(([name, id]) => <TableRow key={name}><TableCell>{name}</TableCell><TableCell sx={{ overflowWrap: 'anywhere' }}>{id}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}><Button onClick={onClose} sx={{ bgcolor: teal, color: '#fff', textTransform: 'none', px: 2.5, '&:hover': { bgcolor: '#057899' } }}>OK</Button></DialogActions>
    </Dialog>
  )
}

function DocumentPreviewDialog({ document, onClose }: { document: (typeof documentDefinitions)[number] | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(document)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, color: ink }}>Document Preview</DialogTitle>
      <DialogContent>
        <Stack alignItems="center" spacing={1.5} sx={{ py: 3, bgcolor: page, border: `1px solid ${border}`, borderRadius: '8px' }}>
          <TbFileText size={58} color={teal} />
          <Typography sx={{ px: 2, textAlign: 'center', color: ink, fontWeight: 900 }}>{document?.label}</Typography>
          <Stack direction="row" alignItems="center" spacing={0.6} sx={{ color: '#118d75' }}><TbCheck /><Typography sx={{ fontWeight: 800 }}>Available in demo workspace</Typography></Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={onClose} sx={{ bgcolor: teal, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#057899' } }}>Close</Button></DialogActions>
    </Dialog>
  )
}

function Footer({ compact }: { compact: boolean }) {
  return (
    <Stack direction={compact ? 'column' : 'row'} alignItems="center" justifyContent="space-between" gap={1} sx={{ mx: 2, mt: 2, color: ink, fontSize: 13 }}>
      <Box>Copyright {'\u00A9'} 2026 FastShip, All rights reserved.</Box>
      <Stack direction="row" spacing={2} sx={{ color: '#105efb', fontWeight: 700 }}>
        <Box component="a" href="#/policies/privacy_policy">Privacy Policy</Box>
        <Box component="a" href="#/policies/refund_cancellation">Refund & Cancellation</Box>
        <Box component="a" href="#/policies/terms_of_service">Terms and Conditions</Box>
      </Stack>
    </Stack>
  )
}
