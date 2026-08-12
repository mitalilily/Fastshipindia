type OnboardingStatusUser = {
  onboardingComplete?: boolean | null
  profileComplete?: boolean | null
  onboardingStep?: number | null
  companyInfo?: {
    businessName?: string | null
    brandName?: string | null
    contactPerson?: string | null
    contactEmail?: string | null
    companyEmail?: string | null
    contactNumber?: string | null
    companyContactNumber?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
  } | null
}

const hasText = (value?: string | null) => typeof value === 'string' && value.trim().length > 0

export const hasOnboardingCompanyIdentity = (user?: OnboardingStatusUser | null) => {
  const companyInfo = user?.companyInfo
  if (!companyInfo) return false

  const hasBusinessName = [
    companyInfo.businessName,
    companyInfo.brandName,
  ].some(hasText)
  const hasContact = [
    companyInfo.contactEmail,
    companyInfo.companyEmail,
    companyInfo.contactNumber,
    companyInfo.companyContactNumber,
  ].some(hasText)
  const hasLocation = [
    companyInfo.city,
    companyInfo.state,
    companyInfo.pincode,
  ].some(hasText)

  return hasBusinessName && hasContact && hasLocation
}

export const isOnboardingComplete = (user?: OnboardingStatusUser | null) =>
  Boolean(
    user?.onboardingComplete ||
      user?.profileComplete ||
      hasOnboardingCompanyIdentity(user) ||
      Number(user?.onboardingStep ?? 0) < 0,
  )

export const getPostAuthRedirect = (user?: OnboardingStatusUser | null) =>
  isOnboardingComplete(user) ? '/dashboard' : '/onboarding-questions'
