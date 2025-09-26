import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
    id: varchar('id', { length: 100 }).notNull().primaryKey(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    avatarImage: varchar('avatar_image_url', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
})
