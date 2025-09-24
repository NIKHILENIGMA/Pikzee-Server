import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
    clerk_id: varchar().notNull().primaryKey(),
    first_name: varchar(),
    last_name: varchar(),
    email: varchar(),
    profile_image: varchar(),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
})


