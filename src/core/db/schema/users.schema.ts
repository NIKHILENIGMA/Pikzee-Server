import { pgTable, varchar, timestamp, text, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

import { tiers } from './subscription.schema'

// todo: add last_active_workspace_id field to track last active workspace

export const users = pgTable('users', {
    id: varchar('id', { length: 100 }).notNull().primaryKey(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    avatarImage: text('avatar_image_url'),
    tierId: integer('tier_id')
        .notNull()
        .default(1)
        .references(() => tiers.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const usersRelations = relations(users, ({ one }) => ({
    tier: one(tiers, {
        fields: [users.tierId],
        references: [tiers.id]
    })
}))
