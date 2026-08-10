import type { IUserProfileDB } from '../types/user.types'
import { emptyUserProfile } from './utility'

export const APPROVED_MERCHANT_EMAIL = 'sahilmittal1920@gmail.com'

const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase()

export const isApprovedMerchantEmail = (email: unknown) =>
  normalizeEmail(email) === APPROVED_MERCHANT_EMAIL

export const isApprovedMerchant = (
  user?: Partial<IUserProfileDB> | null,
  fallbackEmail?: string | null,
) => {
  const companyInfo = user?.companyInfo
  const profileEmails = [companyInfo?.contactEmail, companyInfo?.companyEmail].filter(
    (value): value is string => Boolean(normalizeEmail(value)),
  )

  if (profileEmails.length > 0) return profileEmails.some(isApprovedMerchantEmail)
  return isApprovedMerchantEmail(fallbackEmail)
}

export const applyApprovedMerchantAccess = (
  user: Partial<IUserProfileDB> | null | undefined,
  email?: string | null,
): IUserProfileDB => {
  const profile = { ...emptyUserProfile, ...(user ?? {}) }

  if (!isApprovedMerchant(profile, email)) return profile

  const approvedAt = profile.approvedAt || new Date().toISOString()

  return {
    ...profile,
    onboardingStep: Math.max(profile.onboardingStep || 0, 3),
    onboardingComplete: true,
    profileComplete: true,
    approved: true,
    approvedAt,
    rejectionReason: null,
    domesticKyc: {
      status: 'verified',
      updatedAt: profile.domesticKyc?.updatedAt || new Date(),
    },
    companyInfo: {
      ...emptyUserProfile.companyInfo,
      ...profile.companyInfo,
      businessName: profile.companyInfo?.businessName || 'FastShip Merchant',
      brandName: profile.companyInfo?.brandName || 'FastShip',
      contactPerson: profile.companyInfo?.contactPerson || 'Sahil Mittal',
      contactEmail: APPROVED_MERCHANT_EMAIL,
      companyEmail: APPROVED_MERCHANT_EMAIL,
    },
  }
}
