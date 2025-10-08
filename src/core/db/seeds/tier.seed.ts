import { logger } from '@/config/logger'
import { db } from '../drizzle'

import { tiers } from '../schema/subscription.schema'

interface TierData {
    name: 'FREE' | 'PRO' | 'ENTERPRISE'
    monthlyPrice: number // in cents
    yearlyPrice: number // in cents
    storageLimitBytes: number
    fileUploadLimitBytes: number
    membersPerWorkspaceLimit: number // -1 for unlimited
    projectsPerWorkspaceLimit: number // -1 for unlimited
    docsPerWorkspaceLimit: number // -1 for unlimited
    draftsPerDocLimit: number
}

const tierData: TierData[] = [
    {
        name: 'FREE' as const,
        monthlyPrice: 0,
        yearlyPrice: 0,
        storageLimitBytes: 1024 * 1024 * 100, // 100 MB
        fileUploadLimitBytes: 1024 * 1024 * 10, // 10 MB per file
        membersPerWorkspaceLimit: 3,
        projectsPerWorkspaceLimit: 2,
        docsPerWorkspaceLimit: 10,
        draftsPerDocLimit: 5
    },
    {
        name: 'PRO' as const,
        monthlyPrice: 1999, // $19.99 in cents
        yearlyPrice: 19999, // $199.99 in cents
        storageLimitBytes: 1024 * 1024 * 1024 * 10, // 10 GB
        fileUploadLimitBytes: 1024 * 1024 * 500, // 500 MB per file
        membersPerWorkspaceLimit: 25,
        projectsPerWorkspaceLimit: 50,
        docsPerWorkspaceLimit: 500,
        draftsPerDocLimit: 20
    },
    {
        name: 'ENTERPRISE' as const,
        monthlyPrice: 4999, // $49.99 in cents
        yearlyPrice: 49999, // $499.99 in cents
        storageLimitBytes: 1024 * 1024 * 1024 * 100, // 100 GB
        fileUploadLimitBytes: 1024 * 1024 * 1024 * 500, // 5GB per file
        membersPerWorkspaceLimit: -1, // Unlimited
        projectsPerWorkspaceLimit: -1, // Unlimited
        docsPerWorkspaceLimit: -1, // Unlimited
        draftsPerDocLimit: 50
    }
]

export const seedTiers = async () => {
    logger.info('🌱 Seeding subscription tiers...')

    try {
        // Clear existing tiers (optional)
        await db.delete(tiers)
        logger.info('🗑️  Cleared existing tiers')

        // Insert new tiers
        const insertedTiers = await db.insert(tiers).values(tierData).returning()

        logger.info('✅ Successfully seeded tiers:')
        insertedTiers.forEach((tier) => {
            logger.info(`- ${tier.name}: $${tier.monthlyPrice / 100}/month`)
        })

        return insertedTiers
    } catch (error) {
        logger.error(`❌ Error seeding tiers: ${(error as Error).message}`)
        throw error
    }
}
