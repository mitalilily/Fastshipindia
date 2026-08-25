import { eq } from 'drizzle-orm'
import { sendWebhookEvent } from '../../services/webhookDelivery.service'
import { db } from '../client'
import { b2c_orders } from '../schema/b2cOrders'
import { b2b_orders } from '../schema/b2bOrders'
import { cancelAmazonShipment, getAmazonShippingTracking } from './amazonShipping.service'
import {
  applyAmazonShippingCredentialsToEnv,
  getStoredAmazonShippingCredentials,
} from './amazonShippingCredentials.service'
import { DelhiveryB2BService } from './couriers/delhiveryB2B.service'
import { DelhiveryService } from './couriers/delhivery.service'
import { BigshipService } from './couriers/bigship.service'
import { EkartService } from './couriers/ekart.service'
import { ShadowfaxService } from './couriers/shadowfax.service'
import { ShipmozoService } from './couriers/shipmozo.service'
import { XpressbeesService } from './couriers/xpressbees.service'
import { logTrackingEvent } from './trackingEvents.service'
import { applyCancellationRefundOnce } from './webhookProcessor'

const SUPPORTED_CANCELLATION_PROVIDERS = new Set([
  'delhivery',
  'ekart',
  'xpressbees',
  'shadowfax',
  'amazon',
  'bigship',
  'shipmozo',
])

const TERMINAL_NON_CANCELLABLE_STATUSES = new Set(['delivered', 'rto_delivered'])

const cancellationResponseText = (value: unknown) => {
  try {
    return JSON.stringify(value || {}).toLowerCase()
  } catch {
    return String(value || '').toLowerCase()
  }
}

const isCancellationAccepted = (result: any) => {
  const responseText = cancellationResponseText(result)
  const numericStatus = Number(
    result?.status ??
      result?.result ??
      result?.responseCode ??
      result?.code ??
      result?.ReturnCode ??
      result?.returnCode,
  )
  const alreadyCancelled =
    responseText.includes('already cancelled') || responseText.includes('already canceled')
  const rejected =
    responseText.includes('not accepted') ||
    responseText.includes('failed') ||
    responseText.includes('failure')
  const acceptedText =
    responseText.includes('cancelled') ||
    responseText.includes('canceled') ||
    responseText.includes('shipment updated successfully') ||
    responseText.includes('successful') ||
    responseText.includes('cancellation initiated') ||
    responseText.includes('cancellation accepted') ||
    responseText.includes('cancellation request accepted')

  return (
    alreadyCancelled ||
    result?.success === true ||
    result?.Success === true ||
    result?.status === true ||
    String(result?.ReturnCode || result?.returnCode || '').trim() === '100' ||
    String(result?.status || '').toLowerCase() === 'success' ||
    String(result?.result || '').trim() === '1' ||
    (Number.isFinite(numericStatus) && numericStatus >= 200 && numericStatus < 300) ||
    result?.response?.status === true ||
    (acceptedText && !rejected)
  )
}

const isAlreadyCancelledOrMissingProviderShipment = (value: unknown) => {
  const responseText = cancellationResponseText(value)
  return (
    responseText.includes('already cancelled') ||
    responseText.includes('already canceled') ||
    responseText.includes('no waybill found') ||
    responseText.includes('waybill not found') ||
    responseText.includes('way bill not found') ||
    responseText.includes('no way bill found')
  )
}

const normalizeIdempotentCancellationError = (
  error: any,
  provider: string,
  reference: string,
) => {
  const payload = {
    provider,
    reference,
    status: error?.statusCode || error?.response?.status || null,
    message: error?.message || 'Provider reported shipment is already cancelled or missing',
    response: error?.response?.data || null,
  }

  if (!isAlreadyCancelledOrMissingProviderShipment(payload)) {
    throw error
  }

  return {
    success: true,
    alreadyCancelled: true,
    provider,
    reference,
    message: 'Provider has no active waybill for this shipment; marking local order as cancelled.',
    provider_response: payload.response,
    provider_error: payload.message,
  }
}

const requestCancellationRefundAfterStatusUpdate = async (
  order: any,
  source: string,
) => {
  try {
    await db.transaction(async (tx) => {
      await applyCancellationRefundOnce(tx, order, source)
    })
  } catch (error) {
    console.warn('Cancellation refund request failed after local status update:', {
      orderId: order?.id,
      orderNumber: order?.order_number,
      source,
      error,
    })
  }
}

const getCancellationErrorMessage = (result: any) =>
  result?.error ||
  result?.message ||
  result?.ReturnMessage ||
  result?.returnMessage ||
  result?.responseMsg ||
  result?.remark ||
  'Courier cancellation not accepted'

const truncateText = (value: unknown, maxLength: number) => {
  const text = String(value || '').trim()
  if (!text) return null
  return text.length > maxLength ? text.slice(0, maxLength - 3).trimEnd() + '...' : text
}

const getCancellationDeliveryMessage = (result: any) =>
  truncateText(
    result?.message ||
      result?.ReturnMessage ||
      result?.returnMessage ||
      result?.remark ||
      result?.responseMsg,
    100,
  )

const isShadowfaxCancellationProcessingError = (error: any) => {
  const responseText = cancellationResponseText({
    message: error?.message,
    response: error?.response?.data,
    status: error?.statusCode || error?.response?.status,
  })

  return (
    responseText.includes('order is being processed') ||
    responseText.includes('try cancelling after sometime')
  )
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isAmazonCancellationPropagationError = (error: any) => {
  const responseText = cancellationResponseText({
    message: error?.message,
    response: error?.response?.data,
    status: error?.statusCode || error?.response?.status,
  })

  return (
    responseText.includes('ineligible state') ||
    responseText.includes('trackingid not found') ||
    responseText.includes('tracking id not found')
  )
}

const amazonTrackingConfirmsCancellation = async ({
  order,
  credentials,
}: {
  order: any
  credentials: any
}) => {
  const trackingId = String(
    order?.awb_number ||
      order?.provider_meta?.amazon_tracking_id ||
      order?.provider_meta?.trackingId ||
      order?.provider_meta?.tracking_id ||
      '',
  ).trim()

  if (!trackingId) return false

  const carrierId = String(
    order?.provider_meta?.amazon_carrier_id ||
      order?.provider_meta?.carrierId ||
      order?.provider_service ||
      'ATS',
  ).trim()

  try {
    const tracking = await getAmazonShippingTracking({ trackingId, carrierId }, credentials)
    const trackingText = cancellationResponseText(tracking)
    return (
      trackingText.includes('pickupcancelled') ||
      trackingText.includes('pickup cancelled') ||
      trackingText.includes('cancelled') ||
      trackingText.includes('canceled')
    )
  } catch {
    return false
  }
}

const cancelAmazonShipmentWithRetry = async ({
  shipmentId,
  order,
  credentials,
}: {
  shipmentId: string
  order: any
  credentials: any
}) => {
  const retryDelaysMs = [5000, 15000, 30000]
  let lastError: any = null

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await cancelAmazonShipment({ shipmentId }, credentials)
    } catch (error: any) {
      lastError = error
      if (!isAmazonCancellationPropagationError(error)) {
        throw error
      }

      if (await amazonTrackingConfirmsCancellation({ order, credentials })) {
        return {
          success: true,
          message: 'Amazon tracking confirms cancellation',
          provider_response: error?.response?.data || null,
        }
      }

      const delayMs = retryDelaysMs[attempt]
      if (!delayMs) break
      console.warn('Amazon cancellation is still propagating; retrying', {
        orderId: order?.id,
        shipmentId,
        attempt: attempt + 1,
        delayMs,
        message: error?.message || error,
      })
      await delay(delayMs)
    }
  }

  if (await amazonTrackingConfirmsCancellation({ order, credentials })) {
    return {
      success: true,
      message: 'Amazon tracking confirms cancellation',
      provider_response: lastError?.response?.data || null,
    }
  }

  throw lastError
}

const resolveCancellationProvider = (order: any) => {
  const integrationType = String(order?.integration_type || '').trim().toLowerCase()
  if (integrationType.includes('bigship')) return 'bigship'
  if (integrationType.includes('shipmozo')) return 'shipmozo'
  if (integrationType.includes('delhivery')) return 'delhivery'
  if (integrationType.includes('ekart')) return 'ekart'
  if (integrationType.includes('xpressbees') || integrationType.includes('xpress bees')) {
    return 'xpressbees'
  }
  if (integrationType.includes('shadowfax')) return 'shadowfax'
  if (integrationType.includes('amazon')) return 'amazon'

  const providerText = `${integrationType} ${order?.courier_partner || ''}`.trim().toLowerCase()
  if (providerText.includes('delhivery')) return 'delhivery'
  if (providerText.includes('shipmozo')) return 'shipmozo'
  if (providerText.includes('ekart')) return 'ekart'
  if (providerText.includes('xpressbees') || providerText.includes('xpress bees')) {
    return 'xpressbees'
  }
  if (providerText.includes('shadowfax')) return 'shadowfax'
  if (providerText.includes('amazon')) return 'amazon'
  return providerText
}

const isSalesChannelSourceOrder = (order: any) => {
  const localOrderId = String(order?.order_id || '').trim()
  return localOrderId.startsWith('shopify_') || localOrderId.startsWith('woo_')
}

const getB2BCancellationReference = (order: any) =>
  String(
    order?.provider_reference ||
      order?.shipment_id ||
      order?.provider_request_id ||
      order?.awb_number ||
      order?.order_id ||
    '',
  ).trim()

const getBigshipCancellationReference = (order: any) => {
  const providerMeta =
    order?.provider_meta && typeof order.provider_meta === 'object' && !Array.isArray(order.provider_meta)
      ? order.provider_meta
      : {}

  return String(
    order?.provider_reference ||
      order?.order_id ||
      providerMeta?.provider_reference ||
      providerMeta?.order_id ||
      providerMeta?.bigship?.draft?.data?.CustomGlobalOrderId ||
      providerMeta?.bigship?.place?.data?.reference_number ||
      order?.provider_request_id ||
      order?.shipment_id ||
      order?.awb_number ||
      '',
  ).trim()
}

const getShipmozoCancellationReference = (order: any) => {
  const providerMeta =
    order?.provider_meta && typeof order.provider_meta === 'object' && !Array.isArray(order.provider_meta)
      ? order.provider_meta
      : {}

  return String(
    providerMeta?.shipmozo?.shipmozo_order_id ||
      providerMeta?.order_id ||
      providerMeta?.shipmozo?.push?.data?.order_id ||
      providerMeta?.shipmozo?.push?.order_id ||
      order?.order_id ||
      order?.shipment_id ||
      order?.provider_reference ||
      order?.provider_request_id ||
      order?.order_number ||
      '',
  ).trim()
}

const getShipmozoCancellationAwb = (order: any) => {
  const providerMeta =
    order?.provider_meta && typeof order.provider_meta === 'object' && !Array.isArray(order.provider_meta)
      ? order.provider_meta
      : {}

  return String(
    order?.awb_number ||
      providerMeta?.awb_number ||
      providerMeta?.shipmozo?.assign?.data?.awb_number ||
      providerMeta?.shipmozo?.assign?.data?.awb ||
      providerMeta?.shipmozo?.pickup?.data?.awb_number ||
      providerMeta?.shipmozo?.pickup?.data?.awb ||
      '',
  ).trim()
}

const isProviderCancellationVerified = (value: unknown) => {
  const text = cancellationResponseText(value)
  if (
    text.includes('not cancelled') ||
    text.includes('not canceled') ||
    text.includes('cannot be cancelled') ||
    text.includes('cannot be canceled')
  ) {
    return false
  }

  return (
    text.includes('cancelled') ||
    text.includes('canceled') ||
    text.includes('cancelled_by_customer') ||
    text.includes('cancelled by customer') ||
    text.includes('cancelled_by_seller') ||
    text.includes('cancelled by seller')
  )
}

const verifyDelhiveryB2BCancellation = async (svc: DelhiveryB2BService, lrn: string) => {
  const retryDelaysMs = [0, 3000, 7000, 15000]
  let lastTracking: any = null
  let lastError: any = null

  for (const delayMs of retryDelaysMs) {
    if (delayMs > 0) await delay(delayMs)

    try {
      lastTracking = await svc.trackShipment(lrn, true)
      if (isProviderCancellationVerified(lastTracking)) {
        return { verified: true, tracking: lastTracking }
      }
    } catch (error: any) {
      lastError = error
    }
  }

  return { verified: false, tracking: lastTracking, error: lastError }
}

const verifyBigshipCancellation = async (svc: BigshipService, reference: string) => {
  const retryDelaysMs = [0, 3000, 7000, 15000]
  let lastTracking: any = null
  let lastError: any = null

  for (const delayMs of retryDelaysMs) {
    if (delayMs > 0) await delay(delayMs)

    try {
      lastTracking = await svc.trackShipment(reference)
      if (
        isProviderCancellationVerified(lastTracking) ||
        isAlreadyCancelledOrMissingProviderShipment(lastTracking)
      ) {
        return { verified: true, tracking: lastTracking }
      }
    } catch (error: any) {
      lastError = error
      const payload = {
        message: error?.message,
        response: error?.response?.data,
        status: error?.statusCode || error?.response?.status,
      }
      if (isAlreadyCancelledOrMissingProviderShipment(payload)) {
        return { verified: true, tracking: null, error }
      }
    }
  }

  return { verified: false, tracking: lastTracking, error: lastError }
}

const verifyShipmozoCancellation = async (
  svc: ShipmozoService,
  orderId: string,
  awbNumber: string,
) => {
  const retryDelaysMs = [0, 3000, 7000, 15000]
  let lastTracking: any = null
  let lastError: any = null

  for (const delayMs of retryDelaysMs) {
    if (delayMs > 0) await delay(delayMs)

    try {
      const detail = orderId
        ? await svc.getOrderDetail(orderId).catch((error: any) => {
            lastError = error
            return null
          })
        : null
      const tracking = awbNumber
        ? await svc.trackShipment(awbNumber).catch((error: any) => {
            lastError = error
            return null
          })
        : null
      lastTracking = { detail, tracking }

      if (
        isProviderCancellationVerified(detail) ||
        isProviderCancellationVerified(tracking) ||
        isProviderCancellationVerified(lastTracking)
      ) {
        return { verified: true, tracking: lastTracking }
      }
    } catch (error: any) {
      lastError = error
    }
  }

  return { verified: false, tracking: lastTracking, error: lastError }
}

const cancelB2BOrderShipment = async (order: any) => {
  const integration = resolveCancellationProvider(order)
  const currentStatus = String(order.order_status || '').trim().toLowerCase()
  const lrn = getB2BCancellationReference(order)
  const providerMeta: Record<string, unknown> =
    order.provider_meta && typeof order.provider_meta === 'object' && !Array.isArray(order.provider_meta)
      ? (order.provider_meta as Record<string, unknown>)
      : {}

  console.log('B2B order found for cancellation:', {
    orderId: order.id,
    orderNumber: order.order_number,
    integrationType: integration,
    lrn,
    awbNumber: order.awb_number,
    shipmentId: order.shipment_id,
    currentStatus,
  })

  const existingCancellation =
    providerMeta.cancellation && typeof providerMeta.cancellation === 'object'
      ? (providerMeta.cancellation as Record<string, unknown>)
      : null
  const providerAlreadyVerified = Boolean(existingCancellation?.provider_verified_at)

  if (currentStatus === 'cancelled' && providerAlreadyVerified) {
    return {
      success: true,
      alreadyCancelled: true,
      message: 'Order already cancelled',
    }
  }

  if (TERMINAL_NON_CANCELLABLE_STATUSES.has(currentStatus)) {
    throw new Error(`Order is already ${currentStatus} and cannot be cancelled`)
  }

  if (integration === 'bigship') {
    const bigshipReference = getBigshipCancellationReference(order)
    if (!bigshipReference) {
      throw new Error('Bigship cancellation requires provider order reference')
    }

    const svc = new BigshipService()
    let cancellationResult: any
    try {
      cancellationResult = await svc.cancelShipment(bigshipReference)
    } catch (error: any) {
      cancellationResult = normalizeIdempotentCancellationError(
        error,
        'bigship',
        bigshipReference,
      )
    }
    const isSuccess = isCancellationAccepted(cancellationResult)

    console.log('Bigship B2B cancellation response validation:', {
      orderId: order.id,
      bigshipReference,
      isSuccess,
      response: cancellationResult,
    })

    if (!isSuccess) {
      throw new Error(getCancellationErrorMessage(cancellationResult))
    }

    const verification = await verifyBigshipCancellation(svc, bigshipReference)
    if (!verification.verified) {
      const requestedAt = new Date()
      const pendingResult = {
        success: true,
        pending_provider_confirmation: true,
        provider: 'bigship',
        provider_reference: bigshipReference,
        message:
          'Bigship cancellation requested; provider tracking has not confirmed cancellation yet.',
        provider_response: cancellationResult,
        last_tracking: verification.tracking || null,
        last_error: verification.error?.message || null,
      }

      await db
        .update(b2b_orders)
        .set({
          order_status: 'cancellation_requested',
          provider_last_status: 'cancellation_requested',
          delivery_message: pendingResult.message,
          provider_meta: {
            ...providerMeta,
            cancellation: {
              provider: 'bigship',
              requested_at: requestedAt.toISOString(),
              provider_reference: bigshipReference,
              awb_number: order.awb_number || null,
              pending_provider_confirmation: true,
              result: cancellationResult,
              last_tracking: verification.tracking || null,
              last_error: verification.error?.message || null,
            },
          },
          updated_at: requestedAt,
        } as any)
        .where(eq(b2b_orders.id, order.id))

      await logTrackingEvent({
        orderId: order.id,
        userId: order.user_id,
        awbNumber: order.awb_number || bigshipReference || null,
        courier: order.courier_partner || 'Bigship B2B',
        statusCode: 'cancellation_requested',
        statusText: 'Bigship B2B cancellation requested',
        raw: pendingResult,
      }).catch((err) => {
        console.warn('Failed to log Bigship B2B cancellation-requested event:', err)
      })

      await sendWebhookEvent(order.user_id, 'tracking.updated', {
        awb_number: order.awb_number || null,
        provider_reference: bigshipReference,
        order_id: order.id,
        order_number: order.order_number,
        status: 'cancellation_requested',
        raw_status: 'cancellation_requested',
        courier_partner: order.courier_partner,
      }).catch((err) => {
        console.warn('Failed to send Bigship B2B cancellation-requested webhook:', err)
      })

      return pendingResult
    }

    const finalStatus = 'cancelled'
    const cancelledAt = new Date()

    await db
      .update(b2b_orders)
      .set({
        order_status: finalStatus,
        provider_last_status: finalStatus,
        delivery_message: getCancellationDeliveryMessage(cancellationResult),
        provider_meta: {
          ...providerMeta,
          cancellation: {
            provider: 'bigship',
            requested_at: cancelledAt.toISOString(),
            provider_verified_at: cancelledAt.toISOString(),
            provider_reference: bigshipReference,
            awb_number: order.awb_number || null,
            result: cancellationResult,
            verified_tracking: verification.tracking || null,
          },
        },
        updated_at: cancelledAt,
      } as any)
      .where(eq(b2b_orders.id, order.id))

    await requestCancellationRefundAfterStatusUpdate(order, 'pickup_cancel_api_bigship_b2b')

    await logTrackingEvent({
      orderId: order.id,
      userId: order.user_id,
      awbNumber: order.awb_number || bigshipReference || null,
      courier: order.courier_partner || 'Bigship B2B',
      statusCode: finalStatus,
      statusText: 'Bigship B2B shipment cancelled',
      raw: cancellationResult,
    }).catch((err) => {
      console.warn('Failed to log Bigship B2B cancellation tracking event:', err)
    })

    await sendWebhookEvent(order.user_id, 'tracking.updated', {
      awb_number: order.awb_number || null,
      provider_reference: bigshipReference,
      order_id: order.id,
      order_number: order.order_number,
      status: finalStatus,
      raw_status: finalStatus,
      courier_partner: order.courier_partner,
    }).catch((err) => {
      console.warn('Failed to send Bigship B2B cancellation tracking webhook:', err)
    })

    await sendWebhookEvent(order.user_id, 'order.cancelled', {
      awb_number: order.awb_number || null,
      provider_reference: bigshipReference,
      order_id: order.id,
      order_number: order.order_number,
      status: finalStatus,
      courier_partner: order.courier_partner,
    }).catch((err) => {
      console.warn('Failed to send Bigship B2B order cancellation webhook:', err)
    })

    return cancellationResult
  }

  if (integration === 'shipmozo') {
    const shipmozoOrderId = getShipmozoCancellationReference(order) || lrn
    const shipmozoAwb = getShipmozoCancellationAwb(order)
    if (!shipmozoOrderId || !shipmozoAwb) {
      throw new Error('Shipmozo cancellation requires provider order id and AWB number')
    }

    const svc = new ShipmozoService()
    const cancellationResult = await svc.cancelOrder(shipmozoOrderId, shipmozoAwb)
    const isSuccess = isCancellationAccepted(cancellationResult)

    console.log('Shipmozo B2B cancellation response validation:', {
      orderId: order.id,
      shipmozoOrderId,
      shipmozoAwb,
      isSuccess,
      response: cancellationResult,
    })

    if (!isSuccess) {
      throw new Error(getCancellationErrorMessage(cancellationResult))
    }

    const verification = await verifyShipmozoCancellation(svc, shipmozoOrderId, shipmozoAwb)
    if (!verification.verified) {
      const requestedAt = new Date()
      const pendingResult = {
        success: true,
        pending_provider_confirmation: true,
        provider: 'shipmozo',
        provider_reference: shipmozoOrderId,
        awb_number: shipmozoAwb,
        message:
          'Shipmozo cancellation requested; provider tracking has not confirmed cancellation yet.',
        provider_response: cancellationResult,
        last_tracking: verification.tracking || null,
        last_error: verification.error?.message || null,
      }

      await db
        .update(b2b_orders)
        .set({
          order_status: 'cancellation_requested',
          provider_last_status: 'cancellation_requested',
          delivery_message: pendingResult.message,
          provider_meta: {
            ...providerMeta,
            cancellation: {
              provider: 'shipmozo',
              requested_at: requestedAt.toISOString(),
              provider_reference: shipmozoOrderId,
              awb_number: shipmozoAwb,
              pending_provider_confirmation: true,
              result: cancellationResult,
              last_tracking: verification.tracking || null,
              last_error: verification.error?.message || null,
            },
          },
          updated_at: requestedAt,
        } as any)
        .where(eq(b2b_orders.id, order.id))

      await logTrackingEvent({
        orderId: order.id,
        userId: order.user_id,
        awbNumber: shipmozoAwb,
        courier: order.courier_partner || 'Shipmozo B2B',
        statusCode: 'cancellation_requested',
        statusText: 'Shipmozo B2B cancellation requested',
        raw: pendingResult,
      }).catch((err) => {
        console.warn('Failed to log Shipmozo B2B cancellation-requested event:', err)
      })

      await sendWebhookEvent(order.user_id, 'tracking.updated', {
        awb_number: shipmozoAwb,
        provider_reference: shipmozoOrderId,
        order_id: order.id,
        order_number: order.order_number,
        status: 'cancellation_requested',
        raw_status: 'cancellation_requested',
        courier_partner: order.courier_partner,
      }).catch((err) => {
        console.warn('Failed to send Shipmozo B2B cancellation-requested webhook:', err)
      })

      return pendingResult
    }

    const finalStatus = 'cancelled'
    const cancelledAt = new Date()

    await db
      .update(b2b_orders)
      .set({
        order_status: finalStatus,
        provider_last_status: finalStatus,
        delivery_message: getCancellationDeliveryMessage(cancellationResult),
        provider_meta: {
          ...providerMeta,
          cancellation: {
            provider: 'shipmozo',
            requested_at: cancelledAt.toISOString(),
            provider_verified_at: cancelledAt.toISOString(),
            provider_reference: shipmozoOrderId,
            awb_number: shipmozoAwb,
            result: cancellationResult,
            verified_tracking: verification.tracking || null,
          },
        },
        updated_at: cancelledAt,
      } as any)
      .where(eq(b2b_orders.id, order.id))

    await requestCancellationRefundAfterStatusUpdate(order, 'pickup_cancel_api_shipmozo_b2b')

    await logTrackingEvent({
      orderId: order.id,
      userId: order.user_id,
      awbNumber: shipmozoAwb,
      courier: order.courier_partner || 'Shipmozo B2B',
      statusCode: finalStatus,
      statusText: 'Shipmozo B2B shipment cancelled',
      raw: cancellationResult,
    }).catch((err) => {
      console.warn('Failed to log Shipmozo B2B cancellation tracking event:', err)
    })

    await sendWebhookEvent(order.user_id, 'tracking.updated', {
      awb_number: shipmozoAwb,
      provider_reference: shipmozoOrderId,
      order_id: order.id,
      order_number: order.order_number,
      status: finalStatus,
      raw_status: finalStatus,
      courier_partner: order.courier_partner,
    }).catch((err) => {
      console.warn('Failed to send Shipmozo B2B cancellation tracking webhook:', err)
    })

    await sendWebhookEvent(order.user_id, 'order.cancelled', {
      awb_number: shipmozoAwb,
      provider_reference: shipmozoOrderId,
      order_id: order.id,
      order_number: order.order_number,
      status: finalStatus,
      courier_partner: order.courier_partner,
    }).catch((err) => {
      console.warn('Failed to send Shipmozo B2B order cancellation webhook:', err)
    })

    return cancellationResult
  }

  if (integration !== 'delhivery') {
    throw new Error('Only Delhivery, Bigship B2B and Shipmozo B2B are supported for B2B cancellation')
  }

  if (!lrn) {
    throw new Error('Delhivery B2B cancellation requires an LRN or shipment reference')
  }

  const svc = new DelhiveryB2BService()
  const cancellationResult = await svc.cancelShipment(lrn)
  const isSuccess = isCancellationAccepted(cancellationResult)

  console.log('Delhivery B2B cancellation response validation:', {
    orderId: order.id,
    lrn,
    isSuccess,
    response: cancellationResult,
  })

  if (!isSuccess) {
    throw new Error(getCancellationErrorMessage(cancellationResult))
  }

  const verification = await verifyDelhiveryB2BCancellation(svc, lrn)
  if (!verification.verified) {
    const requestedAt = new Date()
    await db
      .update(b2b_orders)
      .set({
        order_status: 'cancellation_requested',
        provider_last_status: 'cancellation_requested',
        delivery_message:
          'Cancellation requested with Delhivery B2B; provider has not confirmed cancellation yet',
        provider_meta: {
          ...providerMeta,
          cancellation: {
            provider: 'delhivery_b2b',
            requested_at: requestedAt.toISOString(),
            lrn,
            awb_number: order.awb_number || null,
            pending_provider_confirmation: true,
            result: cancellationResult,
            last_tracking: verification.tracking || null,
            last_error: verification.error?.message || null,
          },
        },
        updated_at: requestedAt,
      })
      .where(eq(b2b_orders.id, order.id))

    throw new Error(
      'Delhivery B2B cancellation was requested but provider tracking has not confirmed cancellation yet. Retry cancel after a minute or check Delhivery One.',
    )
  }

  const finalStatus = 'cancelled'
  const cancelledAt = new Date()

  await db
    .update(b2b_orders)
    .set({
      order_status: finalStatus,
      provider_last_status: finalStatus,
      delivery_message: getCancellationDeliveryMessage(cancellationResult),
      provider_meta: {
        ...providerMeta,
        cancellation: {
          provider: 'delhivery_b2b',
          requested_at: cancelledAt.toISOString(),
          provider_verified_at: cancelledAt.toISOString(),
          lrn,
          awb_number: order.awb_number || null,
          result: cancellationResult,
          verified_tracking: verification.tracking || null,
        },
      },
      updated_at: cancelledAt,
    })
    .where(eq(b2b_orders.id, order.id))

  await requestCancellationRefundAfterStatusUpdate(order, 'pickup_cancel_api_b2b')

  await logTrackingEvent({
    orderId: order.id,
    userId: order.user_id,
    awbNumber: lrn || order.awb_number || null,
    courier: order.courier_partner || 'Delhivery B2B',
    statusCode: finalStatus,
    statusText: 'B2B shipment cancelled',
    raw: cancellationResult,
  }).catch((err) => {
    console.warn('Failed to log B2B cancellation tracking event:', err)
  })

  await sendWebhookEvent(order.user_id, 'tracking.updated', {
    awb_number: order.awb_number || null,
    lrn,
    order_id: order.id,
    order_number: order.order_number,
    status: finalStatus,
    raw_status: finalStatus,
    courier_partner: order.courier_partner,
  }).catch((err) => {
    console.warn('Failed to send B2B cancellation tracking webhook:', err)
  })

  await sendWebhookEvent(order.user_id, 'order.cancelled', {
    awb_number: order.awb_number || null,
    lrn,
    order_id: order.id,
    order_number: order.order_number,
    status: finalStatus,
    courier_partner: order.courier_partner,
  }).catch((err) => {
    console.warn('Failed to send B2B order cancellation webhook:', err)
  })

  return cancellationResult
}

const syncSalesChannelStatusForOrder = async (orderId: string, source: string) => {
  const [updatedOrder] = await db
    .select()
    .from(b2c_orders)
    .where(eq(b2c_orders.id, orderId))
    .limit(1)

  if (!updatedOrder) return

  const localOrderId = String(updatedOrder.order_id || '').trim()
  if (localOrderId.startsWith('shopify_')) {
    const { syncShopifyStatusForLocalOrder } = await import('./shopify.service')
    await syncShopifyStatusForLocalOrder(updatedOrder, db, { source }).catch((err: any) => {
      console.warn(`Shopify status sync skipped after ${source}:`, err?.message || err)
    })
  }

  if (localOrderId.startsWith('woo_')) {
    const { syncWooCommerceStatusForLocalOrder } = await import('./woocommerce.service')
    await syncWooCommerceStatusForLocalOrder(updatedOrder, db, { source }).catch((err: any) => {
      console.warn(`WooCommerce status sync skipped after ${source}:`, err?.message || err)
    })
  }
}

export async function cancelOrderShipment(orderId: string) {
  console.log('Starting cancellation for orderId:', orderId)

  const [order] = await db.select().from(b2c_orders).where(eq(b2c_orders.id, orderId))

  if (!order) {
    const [b2bOrder] = await db.select().from(b2b_orders).where(eq(b2b_orders.id, orderId))

    if (!b2bOrder) {
      console.error('Order not found:', orderId)
      throw new Error('Order not found')
    }

    return cancelB2BOrderShipment(b2bOrder)
  }

  const integration = resolveCancellationProvider(order)
  const currentStatus = String(order.order_status || '').trim().toLowerCase()
  const awbNumber = String(order.awb_number || '').trim()

  console.log('Order found for cancellation:', {
    orderId: order.id,
    orderNumber: order.order_number,
    integrationType: integration,
    awbNumber,
    shipmentId: order.shipment_id,
    currentStatus,
  })

  if (currentStatus === 'cancelled') {
    await syncSalesChannelStatusForOrder(orderId, 'already-cancelled order check')
    return {
      success: true,
      alreadyCancelled: true,
      message: 'Order already cancelled',
    }
  }

  if (TERMINAL_NON_CANCELLABLE_STATUSES.has(currentStatus)) {
    throw new Error(`Order is already ${currentStatus} and cannot be cancelled`)
  }

  if (!SUPPORTED_CANCELLATION_PROVIDERS.has(integration) && !(isSalesChannelSourceOrder(order) && !awbNumber)) {
    console.error('Unsupported integration type:', { orderId, integration })
    throw new Error('Only Delhivery, Ekart, Xpressbees, Shadowfax, Amazon, Bigship and Shipmozo are supported for cancellation')
  }

  const amazonShipmentId = String(
    order.shipment_id ||
      order.provider_reference ||
      order.order_id ||
      (order.provider_meta as any)?.shipment_id ||
      (order.provider_meta as any)?.provider_reference ||
      (order.provider_meta as any)?.shipmentId ||
      '',
  ).trim()

  if (integration === 'amazon' && !amazonShipmentId) {
    console.error('Amazon cancellation failed: Missing shipment id', {
      orderId,
      integration,
      awbNumber,
      shipmentId: order.shipment_id,
      providerReference: order.provider_reference,
    })
    throw new Error('Amazon cancellation requires a shipment id')
  }

  const providerMeta: Record<string, unknown> =
    order.provider_meta && typeof order.provider_meta === 'object' && !Array.isArray(order.provider_meta)
      ? (order.provider_meta as Record<string, unknown>)
      : {}

  console.log('Attempting courier cancellation:', {
    orderId,
    awbNumber,
    shipmentId: integration === 'amazon' ? amazonShipmentId : order.shipment_id,
    integration,
  })

  let cancellationResult: any = null
  if (integration === 'delhivery' && !awbNumber) {
    throw new Error('Delhivery cancellation requires an AWB number')
  }

  if (integration !== 'amazon' && integration !== 'bigship' && integration !== 'shipmozo' && !awbNumber) {
    cancellationResult = {
      success: true,
      localOnly: true,
      message: 'Order has no provider AWB yet; cancelled locally before courier booking.',
    }
  } else if (integration === 'delhivery') {
    const svc = new DelhiveryService()
    cancellationResult = await svc.cancelShipment(awbNumber)
  } else if (integration === 'ekart') {
    const svc = new EkartService()
    cancellationResult = await svc.cancelShipment(awbNumber)
  } else if (integration === 'shadowfax') {
    const svc = new ShadowfaxService()
    const shadowfaxCancelRef = String(
      order.provider_request_id || order.provider_reference || awbNumber,
    ).trim()
    console.log('Shadowfax cancellation identifier', {
      orderId,
      awbNumber,
      providerRequestId: order.provider_request_id,
      providerReference: order.provider_reference,
      cancelReference: shadowfaxCancelRef,
      orderStatus: order.order_status,
    })
    try {
      cancellationResult = await svc.cancelShipment(shadowfaxCancelRef)
    } catch (error: any) {
      if (!isShadowfaxCancellationProcessingError(error)) {
        throw error
      }

      const requestedAt = new Date()
      const pendingResult = {
        success: true,
        pending: true,
        provider: 'shadowfax',
        message:
          'Shadowfax is still processing this new order. Cancellation has been requested and will finalize after provider confirmation.',
        provider_response: error?.response?.data || null,
      }

      console.warn('Shadowfax cancellation is processing; marking local order as cancellation_requested', {
        orderId,
        awbNumber,
        cancelReference: shadowfaxCancelRef,
        providerResponse: error?.response?.data || null,
      })

      await db
        .update(b2c_orders)
        .set({
          order_status: 'cancellation_requested',
          pickup_status: 'cancellation_requested',
          provider_last_status: 'cancellation_requested',
          delivery_message: 'Cancellation requested with Shadowfax',
          provider_meta: {
            ...providerMeta,
            cancellation: {
              provider: integration,
              requested_at: requestedAt.toISOString(),
              awb_number: awbNumber || null,
              pending: true,
              result: pendingResult,
            },
          },
          updated_at: requestedAt,
        })
        .where(eq(b2c_orders.id, orderId))

      await logTrackingEvent({
        orderId: order.id,
        userId: order.user_id,
        awbNumber: awbNumber || null,
        courier: order.courier_partner || integration,
        statusCode: 'cancellation_requested',
        statusText: 'Cancellation requested',
        raw: pendingResult,
      }).catch((err) => {
        console.warn('Failed to log Shadowfax cancellation-requested event:', err)
      })

      await sendWebhookEvent(order.user_id, 'tracking.updated', {
        awb_number: awbNumber || order.awb_number,
        order_id: order.id,
        order_number: order.order_number,
        status: 'cancellation_requested',
        raw_status: 'cancellation_requested',
        courier_partner: order.courier_partner,
      }).catch((err) => {
        console.warn('Failed to send Shadowfax cancellation-requested webhook:', err)
      })

      await syncSalesChannelStatusForOrder(orderId, 'cancellation request')

      return pendingResult
    }
  } else if (integration === 'amazon') {
    const amazonCredentials = await getStoredAmazonShippingCredentials()
    applyAmazonShippingCredentialsToEnv(amazonCredentials)
    cancellationResult = await cancelAmazonShipmentWithRetry({
      shipmentId: amazonShipmentId,
      order,
      credentials: amazonCredentials,
    })
  } else if (integration === 'bigship') {
    const bigshipReference = getBigshipCancellationReference(order)
    if (!bigshipReference) {
      throw new Error('Bigship cancellation requires provider order reference')
    }

    const svc = new BigshipService()
    try {
      cancellationResult = await svc.cancelShipment(bigshipReference)
    } catch (error: any) {
      cancellationResult = normalizeIdempotentCancellationError(
        error,
        'bigship',
        bigshipReference,
      )
    }
  } else if (integration === 'shipmozo') {
    const shipmozoOrderId = getShipmozoCancellationReference(order)
    const shipmozoAwb = getShipmozoCancellationAwb(order)
    if (!shipmozoOrderId || !shipmozoAwb) {
      throw new Error('Shipmozo cancellation requires provider order id and AWB number')
    }

    const svc = new ShipmozoService()
    cancellationResult = await svc.cancelOrder(shipmozoOrderId, shipmozoAwb)
  } else {
    const svc = new XpressbeesService()
    cancellationResult = await svc.cancelShipment(awbNumber)
  }

  const isSuccess = isCancellationAccepted(cancellationResult)

  console.log('Courier cancellation response validation:', {
    integration,
    isSuccess,
    success: cancellationResult?.success,
    Success: cancellationResult?.Success,
    status: cancellationResult?.status,
    statusType: typeof cancellationResult?.status,
    remark: cancellationResult?.remark,
    message: cancellationResult?.message,
    error: cancellationResult?.error,
    fullResponse: cancellationResult,
  })

  if (!isSuccess) {
    const errorMsg = getCancellationErrorMessage(cancellationResult)
    console.error('Courier cancellation failed:', {
      orderId,
      integration,
      response: cancellationResult,
      message: errorMsg,
    })
    throw new Error(errorMsg)
  }

  let bigshipCancellationVerification: any = null
  let bigshipCancellationReference = ''
  let shipmozoCancellationVerification: any = null
  let shipmozoCancellationReference = ''
  let shipmozoCancellationAwb = ''
  if (integration === 'bigship') {
    const svc = new BigshipService()
    bigshipCancellationReference = getBigshipCancellationReference(order)
    bigshipCancellationVerification = await verifyBigshipCancellation(svc, bigshipCancellationReference)

    if (!bigshipCancellationVerification.verified) {
      const requestedAt = new Date()
      const pendingResult = {
        success: true,
        pending_provider_confirmation: true,
        provider: 'bigship',
        provider_reference: bigshipCancellationReference,
        message:
          'Bigship cancellation requested; provider tracking has not confirmed cancellation yet.',
        provider_response: cancellationResult,
        last_tracking: bigshipCancellationVerification.tracking || null,
        last_error: bigshipCancellationVerification.error?.message || null,
      }

      await db
        .update(b2c_orders)
        .set({
          order_status: 'cancellation_requested',
          pickup_status: 'cancellation_requested',
          provider_last_status: 'cancellation_requested',
          delivery_message: pendingResult.message,
          provider_meta: {
            ...providerMeta,
            cancellation: {
              provider: integration,
              requested_at: requestedAt.toISOString(),
              provider_reference: bigshipCancellationReference || null,
              awb_number: awbNumber || null,
              pending_provider_confirmation: true,
              result: cancellationResult,
              last_tracking: bigshipCancellationVerification.tracking || null,
              last_error: bigshipCancellationVerification.error?.message || null,
            },
          },
          updated_at: requestedAt,
        })
        .where(eq(b2c_orders.id, orderId))

      await syncSalesChannelStatusForOrder(orderId, 'bigship cancellation request')

      await logTrackingEvent({
        orderId: order.id,
        userId: order.user_id,
        awbNumber: awbNumber || bigshipCancellationReference || null,
        courier: order.courier_partner || integration,
        statusCode: 'cancellation_requested',
        statusText: 'Bigship cancellation requested',
        raw: pendingResult,
      }).catch((err) => {
        console.warn('Failed to log Bigship cancellation-requested event:', err)
      })

      await sendWebhookEvent(order.user_id, 'tracking.updated', {
        awb_number: awbNumber || order.awb_number,
        provider_reference: bigshipCancellationReference || null,
        order_id: order.id,
        order_number: order.order_number,
        status: 'cancellation_requested',
        raw_status: 'cancellation_requested',
        courier_partner: order.courier_partner,
      }).catch((err) => {
        console.warn('Failed to send Bigship cancellation-requested webhook:', err)
      })

      return pendingResult
    }
  }

  if (integration === 'shipmozo') {
    const svc = new ShipmozoService()
    shipmozoCancellationReference = getShipmozoCancellationReference(order)
    shipmozoCancellationAwb = getShipmozoCancellationAwb(order)
    shipmozoCancellationVerification = await verifyShipmozoCancellation(
      svc,
      shipmozoCancellationReference,
      shipmozoCancellationAwb,
    )

    if (!shipmozoCancellationVerification.verified) {
      const requestedAt = new Date()
      const pendingResult = {
        success: true,
        pending_provider_confirmation: true,
        provider: 'shipmozo',
        provider_reference: shipmozoCancellationReference,
        awb_number: shipmozoCancellationAwb,
        message:
          'Shipmozo cancellation requested; provider tracking has not confirmed cancellation yet.',
        provider_response: cancellationResult,
        last_tracking: shipmozoCancellationVerification.tracking || null,
        last_error: shipmozoCancellationVerification.error?.message || null,
      }

      await db
        .update(b2c_orders)
        .set({
          order_status: 'cancellation_requested',
          pickup_status: 'cancellation_requested',
          provider_last_status: 'cancellation_requested',
          delivery_message: pendingResult.message,
          provider_meta: {
            ...providerMeta,
            cancellation: {
              provider: integration,
              requested_at: requestedAt.toISOString(),
              provider_reference: shipmozoCancellationReference || null,
              awb_number: shipmozoCancellationAwb || null,
              pending_provider_confirmation: true,
              result: cancellationResult,
              last_tracking: shipmozoCancellationVerification.tracking || null,
              last_error: shipmozoCancellationVerification.error?.message || null,
            },
          },
          updated_at: requestedAt,
        })
        .where(eq(b2c_orders.id, orderId))

      await syncSalesChannelStatusForOrder(orderId, 'shipmozo cancellation request')

      await logTrackingEvent({
        orderId: order.id,
        userId: order.user_id,
        awbNumber: shipmozoCancellationAwb || null,
        courier: order.courier_partner || integration,
        statusCode: 'cancellation_requested',
        statusText: 'Shipmozo cancellation requested',
        raw: pendingResult,
      }).catch((err) => {
        console.warn('Failed to log Shipmozo cancellation-requested event:', err)
      })

      await sendWebhookEvent(order.user_id, 'tracking.updated', {
        awb_number: shipmozoCancellationAwb || order.awb_number,
        provider_reference: shipmozoCancellationReference || null,
        order_id: order.id,
        order_number: order.order_number,
        status: 'cancellation_requested',
        raw_status: 'cancellation_requested',
        courier_partner: order.courier_partner,
      }).catch((err) => {
        console.warn('Failed to send Shipmozo cancellation-requested webhook:', err)
      })

      return pendingResult
    }
  }

  const finalStatus = 'cancelled'
  console.log(`Updating order status to ${finalStatus}:`, { orderId, integration })
  const cancelledAt = new Date()

  await db
    .update(b2c_orders)
    .set({
      order_status: finalStatus,
      pickup_status: finalStatus,
      provider_last_status: finalStatus,
      delivery_message: getCancellationDeliveryMessage(cancellationResult),
      provider_meta: {
        ...providerMeta,
        cancellation: {
          provider: integration,
          requested_at: cancelledAt.toISOString(),
          ...(integration === 'bigship'
            ? {
                provider_verified_at: cancelledAt.toISOString(),
                provider_reference: bigshipCancellationReference || null,
                verified_tracking: bigshipCancellationVerification?.tracking || null,
              }
            : {}),
          ...(integration === 'shipmozo'
            ? {
                provider_verified_at: cancelledAt.toISOString(),
                provider_reference: shipmozoCancellationReference || null,
                verified_tracking: shipmozoCancellationVerification?.tracking || null,
              }
            : {}),
          awb_number: awbNumber || null,
          result: cancellationResult,
        },
      },
      updated_at: cancelledAt,
    })
    .where(eq(b2c_orders.id, orderId))

  await requestCancellationRefundAfterStatusUpdate(order, 'pickup_cancel_api')

  await syncSalesChannelStatusForOrder(orderId, 'order cancellation')

  await logTrackingEvent({
    orderId: order.id,
    userId: order.user_id,
    awbNumber: awbNumber || null,
    courier: order.courier_partner || integration,
    statusCode: finalStatus,
    statusText: 'Shipment cancelled',
    raw: cancellationResult,
  }).catch((err) => {
    console.warn('Failed to log cancellation tracking event:', err)
  })

  await sendWebhookEvent(order.user_id, 'tracking.updated', {
    awb_number: awbNumber || order.awb_number,
    order_id: order.id,
    order_number: order.order_number,
    status: finalStatus,
    raw_status: finalStatus,
    courier_partner: order.courier_partner,
  }).catch((err) => {
    console.warn('Failed to send cancellation tracking webhook:', err)
  })

  await sendWebhookEvent(order.user_id, 'order.cancelled', {
    awb_number: awbNumber || order.awb_number,
    order_id: order.id,
    order_number: order.order_number,
    status: finalStatus,
    courier_partner: order.courier_partner,
  }).catch((err) => {
    console.warn('Failed to send order cancellation webhook:', err)
  })

  console.log(`Order status updated to ${finalStatus} successfully:`, { orderId, integration })

  return cancellationResult
}
