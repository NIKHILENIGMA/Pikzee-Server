import { pgTable, pgEnum, serial, bigint, integer, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

import { users } from './users.schema'

export const subscriptionNameEnum = pgEnum('subscription_name_enum', ['FREE', 'PRO', 'ENTERPRISE'])

export const tiers = pgTable('tiers', {
    id: serial('id').primaryKey(),
    // Free, Pro, Enterprise
    name: subscriptionNameEnum('subscription_tier').notNull(),
    monthlyPrice: integer('monthly_price').notNull(),
    yearlyPrice: integer('yearly_price').notNull(),
    // File and Upload Storage Limit in Bytes
    storageLimitBytes: bigint('storage_limit_bytes', { mode: 'number' }).notNull(),
    fileUploadLimitBytes: bigint('file_upload_limit_bytes', { mode: 'number' }).notNull(),
    // Workspaces, Projects, Docs, Drafts limits
    membersPerWorkspaceLimit: integer('members_per_workspace_limit').notNull(),
    projectsPerWorkspaceLimit: integer('projects_per_workspace_limit').notNull(),
    docsPerWorkspaceLimit: integer('docs_per_workspace_limit').notNull(),
    draftsPerDocLimit: integer('drafts_per_doc_limit').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const tiersRelations = relations(tiers, ({ many }) => ({
    users: many(users)
}))
