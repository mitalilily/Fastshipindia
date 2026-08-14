import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { supportTickets } from './supportTickets'
import { users } from './users'

export const supportTicketMessages = pgTable('support_ticket_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  senderRole: varchar('sender_role', { length: 20 }).notNull(),
  message: text('message').notNull(),
  attachments: text('attachments').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
