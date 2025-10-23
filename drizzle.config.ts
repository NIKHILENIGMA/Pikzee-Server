import { defineConfig, Config } from 'drizzle-kit'
import { DATABASE_URL } from './src/config'

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/core/db/schema',
    out: './src/core/db/migrations',
    dbCredentials: {
        url: DATABASE_URL
    },
    introspect: {
        casing: 'camel'
    },
    breakpoints: true,
    strict: true,
    verbose: true
}) satisfies Config
