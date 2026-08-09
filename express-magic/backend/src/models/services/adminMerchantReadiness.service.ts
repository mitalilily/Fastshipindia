import { and, eq, sql } from 'drizzle-orm'
import { getMerchantOrderReadiness } from '../../utils/merchantReadiness'
import { HttpError } from '../../utils/classes'
import { CompanyInfo } from '../../types/profileBlocks.types'
import { db } from '../client'
import { kyc } from '../schema/kyc'
import { addresses, pickupAddresses } from '../schema/pickupAddresses'
import { plans } from '../schema/plans'
import { userProfiles } from '../schema/userProfile'
import { userPlans } from '../schema/userPlans'
import { users } from '../schema/users'
import { wallets, walletTransactions } from '../schema/wallet'
import { getPaymentOptions } from './paymentOptions.service'

export interface CompleteMerchantReadinessInput {
  companyAddress?: string
  pickup?: {
    addressLine1?: string
    addressLine2?: string
    landmark?: string
    addressNickname?: string
  }
}

const normalize = (value: unknown) => String(value ?? '').trim()

export async function completeMerchantReadinessByAdmin(
  userId: string,
  input: CompleteMerchantReadinessInput,
  adminId: string,
) {
  const paymentSettings = await getPaymentOptions()
  const requiredWalletBalance = Math.max(Number(paymentSettings?.minWalletRecharge ?? 0), 1)
  const now = new Date()

  const changes = await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ user: users, profile: userProfiles })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1)

    if (!account || account.user.role === 'admin') {
      throw new HttpError(404, 'Merchant account not found')
    }

    const currentCompanyInfo = account.profile.companyInfo as CompanyInfo
    const companyAddress =
      normalize(input.companyAddress) || normalize(currentCompanyInfo.companyAddress)

    if (!companyAddress) {
      throw new HttpError(
        400,
        'companyAddress is required when the merchant profile does not contain an address',
      )
    }

    const companyInfo: CompanyInfo = {
      ...currentCompanyInfo,
      businessName:
        normalize(currentCompanyInfo.businessName) || normalize(currentCompanyInfo.brandName),
      brandName:
        normalize(currentCompanyInfo.brandName) || normalize(currentCompanyInfo.businessName),
      companyAddress,
      companyEmail:
        normalize(currentCompanyInfo.companyEmail) ||
        normalize(currentCompanyInfo.contactEmail) ||
        normalize(account.user.email),
      companyContactNumber:
        normalize(currentCompanyInfo.companyContactNumber) ||
        normalize(currentCompanyInfo.contactNumber) ||
        normalize(account.user.phone),
      contactEmail:
        normalize(currentCompanyInfo.contactEmail) ||
        normalize(currentCompanyInfo.companyEmail) ||
        normalize(account.user.email),
      contactNumber:
        normalize(currentCompanyInfo.contactNumber) ||
        normalize(currentCompanyInfo.companyContactNumber) ||
        normalize(account.user.phone),
    }

    const requiredCompanyValues = [
      companyInfo.businessName,
      companyInfo.companyAddress,
      companyInfo.companyEmail,
      companyInfo.companyContactNumber,
      companyInfo.contactNumber,
      companyInfo.contactEmail,
      companyInfo.state,
      companyInfo.city,
      companyInfo.pincode,
    ]

    if (requiredCompanyValues.some((value) => !normalize(value))) {
      throw new HttpError(
        400,
        'The merchant profile must contain business name, contact, city, state, and pincode before readiness can be completed',
      )
    }

    await tx
      .update(userProfiles)
      .set({
        companyInfo,
        onboardingComplete: true,
        profileComplete: true,
        approved: true,
        approvedAt: account.profile.approvedAt ?? now,
        rejectionReason: null,
        domesticKyc: { status: 'verified', updatedAt: now },
        updatedAt: now,
      })
      .where(eq(userProfiles.userId, userId))

    const verifiedKyc = {
      status: 'verified' as const,
      aadhaarStatus: 'verified' as const,
      panCardStatus: 'verified' as const,
      cancelledChequeStatus: 'verified' as const,
      companyAddressProofStatus: 'verified' as const,
      boardResolutionStatus: 'verified' as const,
      partnershipDeedStatus: 'verified' as const,
      businessPanStatus: 'verified' as const,
      gstCertificateStatus: 'verified' as const,
      llpAgreementStatus: 'verified' as const,
      cinStatus: 'verified' as const,
      rejectionReason: null,
      updatedAt: now,
    }

    await tx
      .insert(kyc)
      .values({ userId, ...verifiedKyc, cancelledChequeRejectionReason: '' })
      .onConflictDoUpdate({
        target: kyc.userId,
        set: verifiedKyc,
      })

    const [enabledPickup] = await tx
      .select({ id: pickupAddresses.id })
      .from(pickupAddresses)
      .where(
        and(eq(pickupAddresses.userId, userId), eq(pickupAddresses.isPickupEnabled, true)),
      )
      .limit(1)

    let pickupCreated = false
    if (!enabledPickup) {
      const [address] = await tx
        .insert(addresses)
        .values({
          userId,
          type: 'pickup',
          contactName:
            normalize(currentCompanyInfo.contactPerson) || normalize(companyInfo.businessName),
          contactPhone: companyInfo.contactNumber,
          contactEmail: companyInfo.contactEmail,
          addressLine1: normalize(input.pickup?.addressLine1) || companyAddress,
          addressLine2: normalize(input.pickup?.addressLine2) || null,
          landmark: normalize(input.pickup?.landmark) || null,
          addressNickname:
            normalize(input.pickup?.addressNickname) || normalize(companyInfo.businessName),
          city: companyInfo.city,
          state: companyInfo.state,
          country: 'India',
          pincode: companyInfo.pincode,
        })
        .returning({ id: addresses.id })

      await tx.insert(pickupAddresses).values({
        userId,
        addressId: address.id,
        rtoAddressId: address.id,
        isPrimary: true,
        isPickupEnabled: true,
        isRTOSame: true,
      })
      pickupCreated = true
    }

    const [activeUserPlan] = await tx
      .select({ id: userPlans.id })
      .from(userPlans)
      .where(and(eq(userPlans.userId, userId), eq(userPlans.is_active, true)))
      .limit(1)

    let planAssigned = false
    if (!activeUserPlan) {
      const [defaultPlan] = await tx
        .select({ id: plans.id })
        .from(plans)
        .where(and(eq(plans.is_active, true), sql`lower(${plans.name}) = 'basic'`))
        .limit(1)

      if (!defaultPlan) {
        throw new HttpError(409, 'No active Basic plan is available for assignment')
      }

      await tx
        .insert(userPlans)
        .values({ userId, plan_id: defaultPlan.id, is_active: true })
        .onConflictDoUpdate({
          target: userPlans.userId,
          set: { plan_id: defaultPlan.id, is_active: true },
        })
      planAssigned = true
    }

    await tx.execute(sql`select ${wallets.id} from ${wallets} where ${wallets.userId} = ${userId} for update`)
    let [wallet] = await tx
      .select({ id: wallets.id, balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1)

    if (!wallet) {
      ;[wallet] = await tx
        .insert(wallets)
        .values({ userId, balance: '0.00', currency: 'INR' })
        .returning({ id: wallets.id, balance: wallets.balance })
    }

    const walletCredit = Math.max(requiredWalletBalance - Number(wallet.balance ?? 0), 0)
    if (walletCredit > 0) {
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${walletCredit}`,
          updatedAt: now,
        })
        .where(eq(wallets.id, wallet.id))

      await tx.insert(walletTransactions).values({
        wallet_id: wallet.id,
        amount: walletCredit,
        currency: 'INR',
        type: 'credit',
        ref: `admin_readiness_${userId}`,
        reason: 'Merchant readiness minimum balance',
        meta: { adjustedBy: adminId, operation: 'complete_merchant_readiness' },
        created_at: now,
      })
    }

    return {
      pickupCreated,
      planAssigned,
      walletCredit,
      requiredWalletBalance,
    }
  })

  return {
    changes,
    readiness: await getMerchantOrderReadiness(userId),
  }
}
