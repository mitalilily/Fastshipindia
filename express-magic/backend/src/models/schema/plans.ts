import { boolean, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull(), // e.g. Basic, Gold, Enterprise
  slug: varchar('slug', { length: 80 }),
  description: varchar('description', { length: 255 }),
  is_active: boolean('is_active').default(true),
  is_default: boolean('is_default').default(false).notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})
