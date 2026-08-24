import { and, count, eq, ilike, or } from 'drizzle-orm'
import { db } from '../client'
import { locations } from '../schema/locations'

const isMissingActiveColumnError = (error: any) =>
  error?.code === '42703' &&
  String(error?.message || '').toLowerCase().includes('active')

export const LocationService = {
  create: async (data: {
    pincode: string
    city: string
    state: string
    country?: string
    active?: boolean
    tags?: string[]
  }) => {
    // Check if a location with the same pincode and city already exists
    const existing = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.pincode, data.pincode),
          eq(locations.city, data.city),
          eq(locations.state, data.state),
          eq(locations.country, data?.country ?? 'India'),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      throw new Error(`Location with pincode ${data.pincode} and city ${data.city} already exists`)
    }

    // Insert new location
    const [location] = await db
      .insert(locations)
      .values({
        ...data,
        country: data.country || 'India',
        active: data.active !== false,
        tags: Array.isArray(data.tags) ? data.tags : [],
      })
      .returning()

    return location
  },

  list: async (params: {
    page?: number
    limit?: number
    filters?: { search?: string; pincode?: string; city?: string; state?: string; active?: boolean }
  }) => {
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []
    let activeCondition
    if (params.filters) {
      const { search, pincode, city, state, active } = params.filters
      const normalizedSearch = String(search || '').trim()
      if (normalizedSearch) {
        const pattern = `%${normalizedSearch}%`
        conditions.push(
          or(
            ilike(locations.pincode, pattern),
            ilike(locations.city, pattern),
            ilike(locations.state, pattern),
          ),
        )
      }
      const normalizedPincode = String(pincode || '').trim()
      if (normalizedPincode) {
        conditions.push(
          /^\d{6}$/.test(normalizedPincode)
            ? eq(locations.pincode, normalizedPincode)
            : ilike(locations.pincode, `%${normalizedPincode}%`),
        )
      }
      if (city) conditions.push(ilike(locations.city, `%${city}%`))
      if (state) conditions.push(ilike(locations.state, `%${state}%`))
      if (typeof active === 'boolean') activeCondition = eq(locations.active, active)
    }

    const whereCondition =
      conditions.length || activeCondition
        ? and(...conditions, activeCondition)
        : undefined

    try {
      const data = await db
        .select()
        .from(locations)
        .where(whereCondition)
        .limit(limit)
        .offset(offset)

      const totalRes = await db.select({ count: count() }).from(locations).where(whereCondition)

      const total = Number(totalRes[0]?.count ?? 0)
      return { data, total, page, limit }
    } catch (error: any) {
      if (!isMissingActiveColumnError(error)) throw error

      if (params.filters?.active === false) {
        return { data: [], total: 0, page, limit }
      }

      const legacyWhereCondition = conditions.length ? and(...conditions) : undefined
      const legacyData = await db
        .select({
          id: locations.id,
          pincode: locations.pincode,
          city: locations.city,
          state: locations.state,
          country: locations.country,
          tags: locations.tags,
          created_at: locations.created_at,
        })
        .from(locations)
        .where(legacyWhereCondition)
        .limit(limit)
        .offset(offset)

      const totalRes = await db
        .select({ count: count() })
        .from(locations)
        .where(legacyWhereCondition)
      const total = Number(totalRes[0]?.count ?? 0)
      return {
        data: legacyData.map((location) => ({ ...location, active: true })),
        total,
        page,
        limit,
      }
    }
  },

  getById: async (id: string) => {
    const [location] = await db.select().from(locations).where(eq(locations.id, id))
    return location
  },

  update: async (
    id: string,
    data: {
      pincode?: string
      city?: string
      state?: string
      country?: string
      active?: boolean
      tags?: string[]
    },
  ) => {
    const updated = await db.update(locations).set(data).where(eq(locations.id, id)).returning()
    return updated[0]
  },

  delete: async (id: string) => {
    const deleted = await db.delete(locations).where(eq(locations.id, id)).returning()
    return deleted[0]
  },
}
