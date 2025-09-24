import { defineConfig, Config } from 'drizzle-kit'
import { APP_CONFIG } from './src/config'

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/core/db/schema',
    out: './src/core/db/migrations',
    dbCredentials: {
        url: APP_CONFIG.DATABASE_URL
    },
    introspect: {
        casing: 'camel'
    },
    breakpoints: true,
    strict: true,
    verbose: true
}) satisfies Config
