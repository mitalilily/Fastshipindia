import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { FiShield } from 'react-icons/fi'
import { MdArrowForward } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import StepOneForm from '../../components/onboarding/StepOneForm'
import StepThree from '../../components/onboarding/StepThree'
import StepTwoForm from '../../components/onboarding/StepTwoForm'
import SwitchAccountButton from '../../components/onboarding/SwitchAccountButton'
import CustomIconLoadingButton from '../../components/UI/button/CustomLoadingButton'
import FullScreenLoader from '../../components/UI/loader/FullScreenLoader'
import { useAuth } from '../../context/auth/AuthContext'
import { useCompleteUserOnboarding } from '../../hooks/useCompleteUserOnboarding'
import { clearOnboardingPrefill, getOnboardingPrefill } from '../../utils/onboardingPrefill'
import type { UserInfoData } from '../../types/user.types'
import { emptyErrors, hasValidationErrors, validateOnboardingFields } from '../../utils/functions'
import { brand, brandGradients } from '../../theme/brand'
import { initialFormData } from '../../utils/utility'
import { isOnboardingComplete } from '../../utils/authRedirect'
import { toast } from '../../components/UI/Toast'

const DE_BLUE = brand.ink
const DE_AMBER = brand.accent
const ONBOARDING_STEPS = [1, 2, 3] as const

export type FormErrors = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof UserInfoData]: any
}

type UserContactFallback = {
  phone?: string
}

const findFirstError = (errors: FormErrors): { field: string; message: string } | null => {
  for (const sectionValue of Object.values(errors)) {
    if (typeof sectionValue === 'string' && sectionValue) {
      return { field: '', message: sectionValue }
    }

    if (sectionValue && typeof sectionValue === 'object') {
      for (const [field, message] of Object.entries(sectionValue as Record<string, unknown>)) {
        if (typeof message === 'string' && message.trim()) {
          return { field, message }
        }
      }
    }
  }

  return null
}

export default function UserOnboarding() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { user: userData, loading: fetchingUserData } = useAuth()
  const { mutateAsync: completeOnboarding, isPending } = useCompleteUserOnboarding()

  const [formData, setFormData] = useState<UserInfoData>({ ...initialFormData })
  const [formErrors, setFormErrors] = useState<FormErrors>(
    JSON.parse(JSON.stringify(emptyErrors)) as FormErrors,
  )

  useEffect(() => {
    if (!userData) return

    if (isOnboardingComplete(userData)) {
      navigate('/dashboard')
      return
    }

  }, [userData, navigate])

  useEffect(() => {
    if (!userData || !Object.keys(userData).length) return

    const prefill = getOnboardingPrefill()

    setFormData({
      basicInfo: {
        firstName:
          userData?.companyInfo?.contactPerson?.split(' ')?.[0] ||
          prefill?.firstName ||
          '',
        lastName:
          userData?.companyInfo?.contactPerson?.split(' ')?.slice(1).join(' ') ||
          prefill?.lastName ||
          '',
        email: userData?.companyInfo?.contactEmail || userData?.email || prefill?.email || '',
        phone:
          userData?.companyInfo?.contactNumber ||
          (userData as typeof userData & UserContactFallback)?.phone ||
          prefill?.phone ||
          '',
        companyName: userData?.companyInfo?.businessName ?? '',
        pincode: userData?.companyInfo?.pincode ?? '',
        state: userData?.companyInfo?.state ?? '',
        city: userData?.companyInfo?.city ?? '',
        companyAddress: userData?.companyInfo?.companyAddress ?? '',
        personalWebsite: userData?.companyInfo?.website ?? '',
      },
      businessLegal: {
        brandName: userData?.companyInfo?.brandName ?? '',
        businessCategory: userData?.businessType ?? [],
        monthlyShipments: userData?.monthlyOrderCount ?? '0-100',
      },
      platformIntegration: { ...(userData?.salesChannels ?? {}) },
    })
    clearOnboardingPrefill()
  }, [userData])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    subKey?: keyof UserInfoData,
  ) => {
    const { name, value } = e.target

    const updatedForm = subKey
      ? {
          ...formData,
          [subKey]: {
            ...formData[subKey],
            [name]: value,
          },
        }
      : {
          ...formData,
          [name]: value,
        }

    setFormData(updatedForm)

    const validationStep =
      subKey === 'businessLegal' ? 2 : subKey === 'platformIntegration' ? 3 : 1
    const newErrors = validateOnboardingFields(updatedForm, validationStep)
    setFormErrors((prev) => {
      if (subKey) {
        return {
          ...prev,
          [subKey]: {
            ...prev[subKey],
            [name]: newErrors[subKey]?.[name] || '',
          },
        }
      }
      return {
        ...prev,
        [name]: newErrors[name] || '',
      }
    })
  }

  const getCombinedErrors = () => {
    const combinedErrors = ONBOARDING_STEPS.reduce((acc, currentStep) => {
      const stepErrors = validateOnboardingFields(formData, currentStep)

      return {
        ...acc,
        basicInfo: {
          ...acc.basicInfo,
          ...stepErrors.basicInfo,
        },
        businessLegal: {
          ...acc.businessLegal,
          ...stepErrors.businessLegal,
        },
        platformIntegration: {
          ...acc.platformIntegration,
          ...stepErrors.platformIntegration,
        },
      }
    }, JSON.parse(JSON.stringify(emptyErrors)) as FormErrors)

    return combinedErrors
  }

  const handleCompleteSetup = async () => {
    const errors = getCombinedErrors()
    setFormErrors(errors)

    if (hasValidationErrors(errors)) {
      const firstError = findFirstError(errors)
      toast.open({
        message: firstError?.message || 'Please complete the highlighted fields before continuing.',
        severity: 'error',
        position: { vertical: 'top', horizontal: 'center' },
      })

      window.requestAnimationFrame(() => {
        const target = firstError?.field
          ? document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
              `[name="${firstError.field}"]`,
            )
          : document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
              '[aria-invalid="true"]',
            )

        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.focus({ preventScroll: true })
      })
      return
    }

    for (const currentStep of ONBOARDING_STEPS) {
      await completeOnboarding({ step: currentStep, data: formData })
    }

    toast.open({
      message: 'Business details saved. Opening your dashboard.',
      severity: 'success',
      position: { vertical: 'top', horizontal: 'center' },
    })
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    navigate('/dashboard')
  }

  if (fetchingUserData) return <FullScreenLoader />

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: brandGradients.page,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: { xs: 2, md: 4 },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
          sx={{ width: '100%', maxWidth: 840, mb: 3 }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 900, color: DE_BLUE, letterSpacing: -0.5, fontSize: '1.4rem' }}
        >
          FastShip Seller Panel
        </Typography>
        <SwitchAccountButton />
      </Stack>

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 960,
          borderRadius: '34px',
          border: `1px solid ${alpha('#FFFFFF', 0.72)}`,
          overflow: 'hidden',
          display: 'block',
          boxShadow: '0 24px 54px rgba(15, 44, 67, 0.1)',
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, md: 4 },
            background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,251,255,0.98) 100%)',
          }}
        >
            <Box sx={{ mb: 3 }}>
              <Chip
                icon={<FiShield size={15} />}
                label="Secure merchant setup"
                sx={{
                  mb: 1.4,
                  bgcolor: alpha(DE_AMBER, 0.14),
                  color: DE_BLUE,
                  fontWeight: 800,
                  border: `1px solid ${alpha(DE_AMBER, 0.24)}`,
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: alpha(DE_BLUE, 0.6),
                  mb: 0.75,
                }}
              >
                FastShip onboarding
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '1.35rem', md: '1.8rem' },
                  fontWeight: 900,
                  color: DE_BLUE,
                }}
              >
                Fill your business details
              </Typography>
              <Typography sx={{ mt: 0.9, color: alpha(DE_BLUE, 0.72), fontSize: '0.94rem', lineHeight: 1.65 }}>
                Add your contact, business, and shipping profile once. We’ll use it to prepare your dashboard,
                courier setup, wallet, and order readiness.
              </Typography>
            </Box>

          <Stack spacing={3}>
            <StepOneForm
              formData={formData}
              errors={formErrors}
              onChange={handleChange}
              setFormData={setFormData}
              setErrors={setFormErrors}
              onNext={() => undefined}
            />
            <StepTwoForm formData={formData} errors={formErrors} onChange={handleChange} />
            <StepThree
              formData={formData}
              errors={formErrors}
              onChange={handleChange}
              setErrors={setFormErrors}
            />
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            alignItems="stretch"
            sx={{ mt: 4, pt: 3, borderTop: `1px solid ${alpha(DE_BLUE, 0.06)}` }}
          >
            <CustomIconLoadingButton
              variant="solid"
              fullWidth
              loading={isPending}
              onClick={handleCompleteSetup}
              endIconNode={<MdArrowForward />}
              text="Save Details & Open Dashboard"
              styles={{
                flex: 1,
                background: brandGradients.button,
                color: brand.ink,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: '1rem',
                py: 1.25,
                boxShadow: '0 16px 32px rgba(130,194,255,0.24)',
              }}
            />
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}


