import 'dotenv/config'
import { runAllSeeds } from '../src/core/db/seeds'
import { logger } from '@/config/logger'

const runSeeds = async () => {
    try {
        await runAllSeeds()
        process.exit(0)
    } catch (error) {
        logger.error(`❌ Seeding process failed: ${(error as Error).message}`)
        process.exit(1)
    }
}

runSeeds().catch((error) => {
    logger.error(`❌ Unexpected error: ${(error as Error).message}`)
    process.exit(1)
})
