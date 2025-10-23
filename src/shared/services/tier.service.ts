import { db } from '@/core/db'
import { tiers } from '@/core/db/schema'
import { DatabaseError } from '@/util'
import { eq } from 'drizzle-orm'

class TierService {
    static async getTierById(tierId: number) {
        try {
            const [tier] = await db
                .select()
                .from(tiers)
                .where(eq(tiers.id, Number(tierId)))
                .limit(1)
            return tier
        } catch (error) {
            throw new DatabaseError(`Error fetching tier by ID: ${(error as Error)?.message}`, 'TIER_FETCH_ERROR')
        }
    }
}

export { TierService }
