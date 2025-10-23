import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'
import { DATABASE_URL } from '@/config'
import * as schema from './schema'
import { logger } from '@/config/logger'

/**
 * Connection pool for managing PostgreSQL database connections.
 *
 * This pool is configured with the following options:
 * - `connectionString`: The database connection string, sourced from `APP_CONFIG.DATABASE_URL`.
 * - `max`: The maximum number of clients allowed in the pool (20).
 * - `idleTimeoutMillis`: The duration (in milliseconds) after which idle clients are closed (30,000 ms).
 * - `connectionTimeoutMillis`: The maximum time (in milliseconds) to wait for a new connection before timing out (2,000 ms).
 *
 * @remarks
 * Using a connection pool improves performance and resource management by reusing database connections.
 *
 * @see {@link https://node-postgres.com/features/pooling|node-postgres Pooling Documentation}
 */

const config: PoolConfig = {
    connectionString: DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
}
const pool: Pool = new Pool(config)

// Handle pool errors
pool.on('error', (err) => {
    logger.error(`Unexpected error on idle client: ${err?.message || err}`)
    process.exit(-1)
})

export const db = drizzle(pool, { schema })
