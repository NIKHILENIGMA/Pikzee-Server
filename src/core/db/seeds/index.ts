import { seedTiers } from './tier.seed'
import { logger } from '@/config/logger'

export const runAllSeeds = async () => {
    logger.info('🌱 Starting database seeding...')

    try {
        await seedTiers() // Insert the tiers first
        // Add calls to other seed functions here as needed, e.g.:
        // await seedUsers()
        // await seedWorkspaces()
        // await seedProjects()
        // await seedDocs()

        logger.info('✅ All seeds completed successfully!')
    } catch (error) {
        logger.error(`❌ Error during seeding: ${(error as Error).message}`)
        throw error
    }
}

// Export individual seed functions
export { seedTiers }
