import { jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users'
import { walletTransactions, wallets } from './wallet'

export const refundApprovalStatusEnum = pgEnum('refund_approval_status', [
  'pending',
  'approved',
  'declined',
])

export const refundApprovalRequests = pgTable(
  'refund_approval_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    walletTransactionId: uuid('wallet_transaction_id').references(() => walletTransactions.id, {
      onDelete: 'set null',
    }),
    amount: numeric('amount', { precision: 12, scale: 2 }).$type<number>().notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    status: refundApprovalStatusEnum('status').default('pending').notNull(),
    reason: varchar('reason', { length: 128 }).notNull(),
    source: varchar('source', { length: 80 }).notNull(),
    notes: text('notes'),
    requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    orderSourceReasonUnique: uniqueIndex('refund_approval_order_source_reason_unique').on(
      table.orderId,
      table.source,
      table.reason,
    ),
  }),
)
