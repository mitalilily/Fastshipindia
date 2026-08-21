import type { JSX } from '@emotion/react/jsx-runtime'
import type { ReactNode } from 'react'
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import moment from 'moment'
import {
  MdAccountBalance,
  MdAccountBox,
  MdBadge,
  MdBusiness,
  MdDescription,
  MdEdit,
  MdErrorOutline,
  MdGavel,
  MdImage,
  MdPreview,
  MdVerifiedUser,
} from 'react-icons/md'
import { usePresignedDownloadUrls } from '../../../../hooks/Uploads/usePresignedDownloadUrls'
import type { BusinessStructure, CompanyType } from '../../../../types/generic.types'
import type { KycDetails } from '../../../../types/user.types'
import { requiredKycDetails } from '../../../../utils/constants'
import { getMimeType } from '../../../../utils/functions'
import { BRAND_GRADIENT } from '../UserProfileForm'
import type { AdditionalKYCForm } from './AdditionalInfoStep'

const iconMap: Record<string, JSX.Element> = {
  panCardUrl: <MdBadge />,
  aadhaarUrl: <MdVerifiedUser />,
  aadhaarFrontUrl: <MdVerifiedUser />,
  aadhaarBackUrl: <MdVerifiedUser />,
  cancelledChequeUrl: <MdAccountBalance />,
  partnershipDeedUrl: <MdGavel />,
  boardResolutionUrl: <MdDescription />,
  businessPanUrl: <MdBadge />,
  companyAddressProofUrl: <MdBusiness />,
  gstCertificateUrl: <MdDescription />,
  llpAgreementUrl: <MdGavel />,
  msmeCertUrl: <MdDescription />,
  selfieUrl: <MdAccountBox />,
  structure: <MdBusiness />,
  companyType: <MdBusiness />,
  gstin: <MdDescription />,
  cin: <MdBusiness />,
  createdAt: <MdDescription />,
  updatedAt: <MdDescription />,
}

const getLabel = (key: string) => {
  const map: Record<string, string> = {
    panCardUrl: 'PAN Card',
    aadhaarUrl: 'Aadhaar Card',
    aadhaarFrontUrl: 'Aadhaar Front Side',
    aadhaarBackUrl: 'Aadhaar Back Side',
    businessPanUrl: 'Business PAN',
    llpAgreementUrl: 'LLP Agreement',
    gstCertificateUrl: 'GST Certificate',
    companyAddressProofUrl: 'Company Address Proof',
    cancelledChequeUrl: 'Cancelled Cheque',
    partnershipDeedUrl: 'Partnership Deed',
    boardResolutionUrl: 'Board Resolution',
    msmeCertUrl: 'MSME Certificate',
    structure: 'Business Structure',
    companyType: 'Company Type',
    selfieUrl: 'Selfie',
    gstin: 'GSTIN',
    cin: 'CIN',
    createdAt: 'Submitted On',
    updatedAt: 'Last Updated',
  }
  return map[key] || key
}

const readableValue = (value?: string | null) =>
  value
    ? value
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : ''

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getStatus = (kyc: any, key: string) => kyc?.[`${key.replace('Url', '')}Status`] as string

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getRejection = (kyc: any, key: string) => {
  const stem = key.replace('Url', '')
  return (kyc?.[`${stem}RejectionReason`] || kyc?.[`${stem}Reason`]) as string
}

const StatusChip = ({ status }: { status?: string }) => {
  const config = {
    verified: { bg: '#E8F8F0', border: '#A7F3D0', color: '#047857', label: 'Verified' },
    rejected: { bg: '#FEE2E2', border: '#FECACA', color: '#B91C1C', label: 'Rejected' },
    verification_in_progress: {
      bg: '#FFF7ED',
      border: '#FED7AA',
      color: '#C2410C',
      label: 'In progress',
    },
    pending: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', label: 'Pending' },
    missing: { bg: '#F8FAFC', border: '#CBD5E1', color: '#64748B', label: 'Not uploaded' },
  }

  const style = status ? config[status as keyof typeof config] : null

  return status && style ? (
    <Chip
      size="small"
      label={style.label}
      sx={{
        height: 24,
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        bgcolor: style.bg,
        color: style.color,
        fontSize: '0.72rem',
        fontWeight: 800,
        letterSpacing: 0,
      }}
    />
  ) : null
}

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <Typography
    variant="h6"
    fontWeight={800}
    sx={{
      mb: 2,
      color: '#17213C',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      '&::before': {
        content: '""',
        width: 4,
        height: 22,
        bgcolor: '#10B981',
        borderRadius: 999,
      },
    }}
  >
    {children}
  </Typography>
)

const PreviewBlock = ({
  labelKey,
  url,
  mime,
  loading,
  kyc,
}: {
  labelKey: string
  url?: string | null
  mime?: string | null
  loading?: boolean
  kyc?: KycDetails
}) => {
  const label = getLabel(labelKey)
  const icon = iconMap[labelKey] || <MdImage />
  const status = getStatus(kyc, labelKey)
  const rejectionReason = getRejection(kyc, labelKey)
  const mimeType = mime || (url ? getMimeType(url) : '')
  const isPdf = mimeType.includes('pdf')

  if (loading) {
    return (
      <Grid size={{ md: 4, sm: 6, xs: 12 }}>
        <Box
          sx={{
            border: '1px solid #E2E8F0',
            borderRadius: 2,
            p: 2,
            bgcolor: '#FFFFFF',
          }}
        >
          <Skeleton width="55%" height={24} />
          <Skeleton variant="rounded" width="100%" height={126} sx={{ mt: 1.5 }} />
        </Box>
      </Grid>
    )
  }

  return (
    <Grid size={{ md: 4, sm: 6, xs: 12 }}>
      <Box
        sx={{
          height: '100%',
          p: 2,
          borderRadius: 2,
          border: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: '#B6C6DB',
            boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)',
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
          <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: '#0A4EA3',
                bgcolor: alpha('#0A4EA3', 0.08),
                border: `1px solid ${alpha('#0A4EA3', 0.14)}`,
                fontSize: 20,
              }}
            >
              {icon}
            </Box>
            <Box minWidth={0}>
              <Typography noWrap fontWeight={800} color="#17213C">
                {label}
              </Typography>
              <Typography variant="caption" color="#64748B">
                {url ? (isPdf ? 'PDF document' : 'Image document') : 'Document not uploaded'}
              </Typography>
            </Box>
          </Stack>
          <StatusChip status={status || (url ? undefined : 'missing')} />
        </Stack>

        <Box
          sx={{
            mt: 2,
            height: 132,
            borderRadius: 2,
            overflow: 'hidden',
            border: url ? '1px solid #E2E8F0' : '1px dashed #CBD5E1',
            bgcolor: '#F8FAFC',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {url ? (
            isPdf ? (
              <Stack alignItems="center" spacing={1}>
                <Box
                  component="img"
                  src="/logo/pdf.png"
                  alt={label}
                  sx={{ width: 54, height: 54, objectFit: 'contain' }}
                />
                <Typography variant="caption" color="#64748B" fontWeight={700}>
                  PDF file attached
                </Typography>
              </Stack>
            ) : (
              <Box
                component="img"
                src={url}
                alt={label}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )
          ) : (
            <Stack alignItems="center" spacing={0.75} textAlign="center" px={2}>
              <Box sx={{ color: '#94A3B8', fontSize: 30, display: 'flex' }}>{icon}</Box>
              <Typography variant="body2" color="#475569" fontWeight={800}>
                Waiting for upload
              </Typography>
              <Typography variant="caption" color="#64748B">
                This requirement is still empty.
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1} mt={1.5} alignItems="center" flexWrap="wrap">
          {url && (
            <Button
              href={url}
              target="_blank"
              rel="noopener"
              variant="outlined"
              size="small"
              startIcon={<MdPreview />}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 800,
                color: '#0A4EA3',
                borderColor: '#C9D7EA',
                '&:hover': {
                  borderColor: '#0A4EA3',
                  bgcolor: alpha('#0A4EA3', 0.06),
                },
              }}
            >
              {isPdf ? 'Open PDF' : 'Preview'}
            </Button>
          )}

          {status === 'rejected' && rejectionReason && (
            <Typography
              variant="caption"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: '#B91C1C',
                fontWeight: 700,
                bgcolor: '#FEE2E2',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              <MdErrorOutline size={16} /> {rejectionReason}
            </Typography>
          )}
        </Stack>
      </Box>
    </Grid>
  )
}

const LabelValue = ({
  labelKey,
  value,
  loading = false,
}: {
  labelKey: string
  value?: string | null
  loading?: boolean
}) => {
  const label = getLabel(labelKey)
  const icon = iconMap[labelKey] || <MdDescription />

  return (
    <Grid size={{ md: 4, sm: 6, xs: 12 }}>
      <Box
        sx={{
          height: '100%',
          minHeight: 94,
          p: 2,
          borderRadius: 2,
          border: '1px solid #E2E8F0',
          bgcolor: '#F8FAFC',
        }}
      >
        <Typography
          variant="body2"
          color="#64748B"
          fontWeight={800}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}
        >
          <Box component="span" sx={{ color: '#0A4EA3', display: 'flex' }}>
            {icon}
          </Box>
          {label}
        </Typography>
        {loading ? (
          <Skeleton width="70%" sx={{ bgcolor: '#E2E8F0' }} />
        ) : (
          <Typography variant="body1" fontWeight={800} color="#0F172A" sx={{ wordBreak: 'break-word' }}>
            {value || '-'}
          </Typography>
        )}
      </Box>
    </Grid>
  )
}

const KycDetailsCard = ({
  onEdit,
  kyc,
  isLoading = false,
}: {
  onEdit?: () => void
  kyc: KycDetails
  isLoading?: boolean
}) => {
  const structure = (kyc?.structure ?? 'company') as BusinessStructure
  const companyType = kyc?.companyType
  const config = requiredKycDetails[structure]
  const companyFields =
    structure === 'company' && typeof config === 'object' && !Array.isArray(config) ? config : null
  const allFields: (keyof AdditionalKYCForm)[] = companyFields
    ? companyFields[(companyType || 'private_limited') as CompanyType] ??
      Object.values(companyFields)[0] ??
      []
    : Array.isArray(config)
    ? config
    : []
  const isFileField = (f: keyof AdditionalKYCForm) =>
    [
      'aadhaarUrl',
      'aadhaarFrontUrl',
      'aadhaarBackUrl',
      'selfieUrl',
      'panCardUrl',
      'partnershipDeedUrl',
      'boardResolutionUrl',
      'llpAgreementUrl',
      'companyAddressProofUrl',
      'cancelledChequeUrl',
      'businessPanUrl',
      'gstCertificateUrl',
    ].includes(f)

  const legacyAadhaarFields =
    !kyc?.aadhaarFrontUrl && !kyc?.aadhaarBackUrl && kyc?.aadhaarUrl
      ? (['aadhaarUrl'] as (keyof AdditionalKYCForm)[])
      : []
  const fileFieldsToShow = Array.from(new Set([...legacyAadhaarFields, ...allFields.filter(isFileField)]))
  const textFieldsToShow = allFields.filter(
    (f: keyof AdditionalKYCForm) => !isFileField(f) && f !== 'cin',
  )

  const keys = [
    kyc?.selfieUrl,
    ...fileFieldsToShow.map((f: keyof AdditionalKYCForm) => kyc?.[f as keyof typeof kyc]),
  ].filter(Boolean) as string[]

  const { data: presignedUrls } = usePresignedDownloadUrls({
    keys,
    enabled: keys.length > 0,
  })

  const loading = isLoading || !kyc

  const urlMap: Record<string, string> = {}
  const mimeMap: Record<string, string> = {}

  if (presignedUrls && Array.isArray(presignedUrls)) {
    let index = 0
    if (kyc?.selfieUrl) {
      urlMap['selfieUrl'] = presignedUrls[index]
      mimeMap['selfieUrl'] = kyc.selfieMime || ''
      index++
    }
    for (const key of fileFieldsToShow) {
      if (kyc?.[key]) {
        urlMap[key] = presignedUrls[index]
        const mimeKey = `${key.replace('Url', '')}Mime` as keyof KycDetails
        mimeMap[key] = (kyc[mimeKey] as string) || ''
        index++
      }
    }
  }

  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: 1180,
        mx: 'auto',
        mt: { xs: 1, md: 2 },
        borderRadius: 3,
        bgcolor: '#FFFFFF',
        border: '1px solid #DCE5F1',
        boxShadow: '0 18px 44px rgba(15, 23, 42, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: BRAND_GRADIENT,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
          mb={3}
        >
          <Box>
            <Typography variant="h5" fontWeight={900} color="#0F172A">
              {loading ? <Skeleton width={150} /> : 'KYC Details'}
            </Typography>
            <Typography color="#64748B" fontWeight={600} mt={0.5}>
              Business verification information and uploaded document checklist.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <StatusChip status={kyc?.status} />
            {!loading && (
              <Button
                variant="contained"
                size="medium"
                startIcon={<MdEdit />}
                onClick={onEdit}
                sx={{
                  minWidth: 100,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 900,
                  background: BRAND_GRADIENT,
                  boxShadow: '0 10px 24px rgba(10, 78, 163, 0.18)',
                }}
              >
                Edit
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ mb: 3, borderColor: '#E2E8F0' }} />

        <SectionTitle>Basic Information</SectionTitle>
        <Grid container spacing={2}>
          <LabelValue labelKey="structure" value={readableValue(structure)} loading={loading} />
          {structure === 'company' && (
            <LabelValue
              labelKey="companyType"
              value={readableValue(companyType || 'private_limited')}
              loading={loading}
            />
          )}
          {allFields.includes('cin') && <LabelValue labelKey="cin" value={kyc?.cin} loading={loading} />}
          {kyc?.selfieUrl && (
            <PreviewBlock
              labelKey="selfieUrl"
              url={urlMap['selfieUrl']}
              mime={mimeMap['selfieUrl']}
              loading={loading}
              kyc={kyc}
            />
          )}
        </Grid>

        <Divider sx={{ my: 4, borderColor: '#E2E8F0' }} />
        <SectionTitle>Uploaded Documents</SectionTitle>
        <Grid container spacing={2}>
          {fileFieldsToShow.map((field: string) => (
            <PreviewBlock
              key={field}
              labelKey={field}
              url={urlMap[field]}
              mime={mimeMap[field]}
              loading={loading}
              kyc={kyc}
            />
          ))}
        </Grid>

        {textFieldsToShow.length > 0 && (
          <>
            <Divider sx={{ my: 4, borderColor: '#E2E8F0' }} />
            <SectionTitle>Other Details</SectionTitle>
            <Grid container spacing={2}>
              {textFieldsToShow.map((field: string) => (
                <LabelValue
                  key={field}
                  labelKey={field}
                  value={kyc?.[field as keyof KycDetails] as string}
                  loading={loading}
                />
              ))}
            </Grid>
          </>
        )}

        <Divider sx={{ my: 4, borderColor: '#E2E8F0' }} />
        <SectionTitle>Activity</SectionTitle>
        <Grid container spacing={2}>
          <LabelValue
            labelKey="createdAt"
            value={kyc?.createdAt ? moment(kyc.createdAt).format('DD MMM YYYY, hh:mm A') : ''}
            loading={loading}
          />
          <LabelValue
            labelKey="updatedAt"
            value={kyc?.updatedAt ? moment(kyc.updatedAt).format('DD MMM YYYY, hh:mm A') : ''}
            loading={loading}
          />
        </Grid>
      </CardContent>
    </Card>
  )
}

export default KycDetailsCard
