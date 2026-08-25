import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../client'
import { b2c_orders } from '../schema/b2cOrders'
import { refundApprovalRequests } from '../schema/refundApprovalRequests'
import { users } from '../schema/users'
import { walletTransactions, wallets } from '../schema/wallet'
import { createNotificationService } from './notifications.service'
import { createWalletTransaction } from './wallet.service'

type RefundRequestSource =
  | 'pickup_cancel_api'
  | 'live_tracking_cancelled'
  | 'external_api_cancel'
  | string

const roundMoney = (amount: number) => Math.round(amount * 100) / 100
const normalizeNullableUuid = (value: unknown) => {
  const text = String(value || '').trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null
}

export const createCancellationRefundApprovalRequest = async ({
  tx,
  order,
  wallet,
  amount,
  reason,
  source,
  requestedBy,
  meta,
}: {
  tx: any
  order: any
  wallet: any
  amount: number
  reason: string
  source: RefundRequestSource
  requestedBy?: string | null
  meta?: Record<string, unknown>
}) => {
  await ensureRefundApprovalSchema()

  const refundAmount = roundMoney(Number(amount || 0))
  if (!refundAmount || refundAmount <= 0) return null

  const [existingRequest] = await tx
    .select()
    .from(refundApprovalRequests)
    .where(
      and(
        eq(refundApprovalRequests.orderId, order.id),
        eq(refundApprovalRequests.source, source),
        eq(refundApprovalRequests.reason, reason),
      ),
    )
    .limit(1)

  if (existingRequest) return existingRequest

  const [request] = await tx
    .insert(refundApprovalRequests)
    .values({
      orderId: order.id,
      userId: order.user_id,
      walletId: wallet.id,
      amount: refundAmount,
      currency: wallet.currency ?? 'INR',
      status: 'pending',
      reason,
      source,
      requestedBy: normalizeNullableUuid(requestedBy),
      meta: {
        order_id: order.id,
        order_number: order.order_number,
        awb_number: order.awb_number,
        order_type: order.order_type,
        courier_partner: order.courier_partner,
        ...meta,
      },
    })
    .returning()

  await createNotificationService({
    targetRole: 'admin',
    title: 'Refund approval required',
    message: `Order ${order.order_number || order.id} was cancelled. Approve refund of Rs ${refundAmount.toFixed(2)} before wallet credit.`,
    type: 'payment',
  }).catch((error) => {
    console.error('Refund approval notification failed:', error)
  })

  return request
}

export const listRefundApprovalRequests = async ({
  status = 'pending',
  limit = 50,
}: {
  status?: 'pending' | 'approved' | 'declined' | 'all'
  limit?: number
} = {}) => {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)
  let query: any = db
    .select({
      id: refundApprovalRequests.id,
      orderId: refundApprovalRequests.orderId,
      userId: refundApprovalRequests.userId,
      walletId: refundApprovalRequests.walletId,
      walletTransactionId: refundApprovalRequests.walletTransactionId,
      amount: refundApprovalRequests.amount,
      currency: refundApprovalRequests.currency,
      status: refundApprovalRequests.status,
      reason: refundApprovalRequests.reason,
      source: refundApprovalRequests.source,
      notes: refundApprovalRequests.notes,
      reviewedBy: refundApprovalRequests.reviewedBy,
      reviewedAt: refundApprovalRequests.reviewedAt,
      meta: refundApprovalRequests.meta,
      createdAt: refundApprovalRequests.createdAt,
      updatedAt: refundApprovalRequests.updatedAt,
      orderNumber: b2c_orders.order_number,
      awbNumber: b2c_orders.awb_number,
      orderStatus: b2c_orders.order_status,
      courierPartner: b2c_orders.courier_partner,
      customerName: users.email,
      customerPhone: users.phone,
    })
    .from(refundApprovalRequests)
    .leftJoin(b2c_orders, eq(refundApprovalRequests.orderId, b2c_orders.id))
    .leftJoin(users, eq(refundApprovalRequests.userId, users.id))

  if (status !== 'all') {
    query = query.where(eq(refundApprovalRequests.status, status))
  }

  return query.orderBy(desc(refundApprovalRequests.createdAt)).limit(normalizedLimit)
}

export const approveRefundApprovalRequest = async ({
  requestId,
  adminUserId,
  notes,
}: {
  requestId: string
  adminUserId: string
  notes?: string
}) => {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(refundApprovalRequests)
      .where(eq(refundApprovalRequests.id, requestId))
      .limit(1)

    if (!request) throw new Error('Refund request not found')
    if (request.status === 'approved') return request
    if (request.status === 'declined') throw new Error('Refund request is already declined')

    const [existingCredit] = await tx
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.wallet_id, request.walletId),
          eq(walletTransactions.type, 'credit'),
          eq(walletTransactions.ref, request.orderId),
          eq(walletTransactions.reason, request.reason),
        ),
      )
      .limit(1)

    let transactionId = existingCredit?.id || null
    if (!transactionId) {
      const [createdCredit] = await createWalletTransaction({
          walletId: request.walletId,
          amount: Number(request.amount),
          type: 'credit',
          ref: request.orderId,
          reason: request.reason,
          currency: request.currency ?? 'INR',
          meta: {
            ...(request.meta && typeof request.meta === 'object' ? request.meta : {}),
            source: 'admin_refund_approval',
            refund_request_id: request.id,
            approved_by: adminUserId,
            approval_notes: notes || '',
          },
          tx: tx as any,
        })
      transactionId = createdCredit?.id || null
    }

    const [updated] = await tx
      .update(refundApprovalRequests)
      .set({
        status: 'approved',
        walletTransactionId: transactionId || null,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        notes: notes || request.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(refundApprovalRequests.id, request.id))
      .returning()

    await createNotificationService({
      targetRole: 'user',
      userId: request.userId,
      title: 'Refund approved',
      message: `Your cancelled order refund of Rs ${Number(request.amount).toFixed(2)} has been added to your wallet.`,
      type: 'payment',
    }).catch((error) => {
      console.error('Refund approved notification failed:', error)
    })

    return updated
  })
}

export const declineRefundApprovalRequest = async ({
  requestId,
  adminUserId,
  notes,
}: {
  requestId: string
  adminUserId: string
  notes?: string
}) => {
  const [updated] = await db
    .update(refundApprovalRequests)
    .set({
      status: 'declined',
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(refundApprovalRequests.id, requestId),
        eq(refundApprovalRequests.status, 'pending'),
      ),
    )
    .returning()

  if (!updated) throw new Error('Pending refund request not found')

  await createNotificationService({
    targetRole: 'user',
    userId: updated.userId,
    title: 'Refund request declined',
    message: `Refund request for cancelled order was declined by admin.${notes ? ` ${notes}` : ''}`,
    type: 'payment',
  }).catch((error) => {
    console.error('Refund declined notification failed:', error)
  })

  return updated
}

export const ensureRefundApprovalSchema = () =>
  db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_approval_status') THEN
        CREATE TYPE refund_approval_status AS ENUM ('pending', 'approved', 'declined');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS refund_approval_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
      amount NUMERIC(12, 2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'INR',
      status refund_approval_status NOT NULL DEFAULT 'pending',
      reason VARCHAR(128) NOT NULL,
      source VARCHAR(80) NOT NULL,
      notes TEXT,
      requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    DO $$
    DECLARE
      constraint_name TEXT;
    BEGIN
      FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'refund_approval_requests'
          AND con.contype = 'f'
          AND att.attname = 'order_id'
      LOOP
        EXECUTE format('ALTER TABLE refund_approval_requests DROP CONSTRAINT IF EXISTS %I', constraint_name);
      END LOOP;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS refund_approval_order_source_reason_unique
      ON refund_approval_requests(order_id, source, reason);

    CREATE INDEX IF NOT EXISTS refund_approval_status_created_at_idx
      ON refund_approval_requests(status, created_at DESC);
  `)
