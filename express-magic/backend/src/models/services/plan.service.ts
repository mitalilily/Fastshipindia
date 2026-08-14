import { and, asc, eq, ne, or, sql } from 'drizzle-orm'
import { HttpError } from '../../utils/classes'
import { db } from '../client'
import { plans } from '../schema/plans'
import { userPlans } from '../schema/userPlans'
import { ensurePlanSchemaCompatibility } from './planSchemaCompatibility.service'

interface GetPlansOptions {
  status?: 'active' | 'inactive'
}

type PlanInput = {
  name?: string
  slug?: string
  description?: string | null
  is_active?: boolean
  is_default?: boolean
  sort_order?: number
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const normalizeSortOrder = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.trunc(parsed))
}

const validateName = (value: unknown) => {
  const name = String(value || '').trim()
  if (name.length < 2 || name.length > 50) {
    throw new HttpError(400, 'Plan name must be between 2 and 50 characters')
  }
  return name
}

const ensureUniquePlan = async (name: string, slug: string, excludeId?: string) => {
  const conditions = or(sql`lower(${plans.name}) = ${name.toLowerCase()}`, eq(plans.slug, slug))
  const duplicate = await db
    .select({ id: plans.id, name: plans.name, slug: plans.slug })
    .from(plans)
    .where(excludeId ? and(conditions, ne(plans.id, excludeId)) : conditions)
    .limit(1)

  if (duplicate[0]) {
    throw new HttpError(409, 'A plan with this name or slug already exists')
  }
}

export const PlansService = {
  getAll: async (options?: GetPlansOptions) => {
    await ensurePlanSchemaCompatibility()
    return db
      .select()
      .from(plans)
      .where(
        options?.status === 'active'
          ? eq(plans.is_active, true)
          : options?.status === 'inactive'
            ? eq(plans.is_active, false)
            : undefined,
      )
      .orderBy(asc(plans.sort_order), asc(plans.created_at))
  },

  create: async (data: PlanInput) => {
    await ensurePlanSchemaCompatibility()
    const name = validateName(data.name)
    const slug = slugify(data.slug || name)
    if (!slug) throw new HttpError(400, 'A valid plan slug is required')
    await ensureUniquePlan(name, slug)

    return db.transaction(async (tx) => {
      const makeDefault = Boolean(data.is_default)
      if (makeDefault) {
        await tx.update(plans).set({ is_default: false })
      }

      const [created] = await tx
        .insert(plans)
        .values({
          name,
          slug,
          description: data.description?.trim() || null,
          is_active: makeDefault ? true : data.is_active !== false,
          is_default: makeDefault,
          sort_order: normalizeSortOrder(data.sort_order),
          updated_at: new Date(),
        })
        .returning()
      return created
    })
  },

  update: async (id: string, data: PlanInput) => {
    await ensurePlanSchemaCompatibility()
    const [current] = await db.select().from(plans).where(eq(plans.id, id)).limit(1)
    if (!current) throw new HttpError(404, 'Plan not found')

    const name = data.name === undefined ? current.name : validateName(data.name)
    const slug = data.slug === undefined ? current.slug || slugify(name) : slugify(data.slug)
    if (!slug) throw new HttpError(400, 'A valid plan slug is required')
    await ensureUniquePlan(name, slug, id)

    if (current.is_default && data.is_default === false) {
      throw new HttpError(400, 'Choose another plan as default before removing this default')
    }
    if (current.is_default && data.is_active === false) {
      throw new HttpError(400, 'The default plan cannot be deactivated')
    }

    return db.transaction(async (tx) => {
      const makeDefault = data.is_default === true
      if (makeDefault) {
        await tx.update(plans).set({ is_default: false })
      }

      const [updated] = await tx
        .update(plans)
        .set({
          name,
          slug,
          ...(data.description !== undefined && {
            description: data.description?.trim() || null,
          }),
          ...(data.is_active !== undefined && { is_active: makeDefault ? true : data.is_active }),
          ...(data.is_default !== undefined && { is_default: data.is_default }),
          ...(data.sort_order !== undefined && { sort_order: normalizeSortOrder(data.sort_order) }),
          updated_at: new Date(),
        })
        .where(eq(plans.id, id))
        .returning()
      return updated
    })
  },

  remove: async (planId: string) => {
    await ensurePlanSchemaCompatibility()
    const [target] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1)
    if (!target) throw new HttpError(404, 'Plan not found')
    if (target.is_default) throw new HttpError(400, 'The default plan cannot be deleted')

    const [defaultPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.is_default, true))
      .limit(1)
    if (!defaultPlan) throw new HttpError(400, 'Set a default plan before deleting another plan')

    return db.transaction(async (tx) => {
      await tx
        .update(userPlans)
        .set({ plan_id: defaultPlan.id, is_active: true })
        .where(eq(userPlans.plan_id, planId))
      const [deleted] = await tx.delete(plans).where(eq(plans.id, planId)).returning()
      return deleted
    })
  },

  assignOrUpdateUserPlan: async (userId: string, planId: string) => {
    await ensurePlanSchemaCompatibility()
    const [selectedPlan] = await db
      .select({ id: plans.id, isActive: plans.is_active })
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1)

    if (!selectedPlan) throw new HttpError(404, 'Plan not found')
    if (!selectedPlan.isActive) throw new HttpError(400, 'Inactive plans cannot be assigned')

    const existing = await db.select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1)
    if (existing.length > 0) {
      const [updated] = await db
        .update(userPlans)
        .set({ plan_id: planId, is_active: true })
        .where(eq(userPlans.userId, userId))
        .returning()
      return updated
    }

    const [inserted] = await db
      .insert(userPlans)
      .values({ userId, plan_id: planId, is_active: true })
      .returning()
    return inserted
  },
}
