import { pgEnum, pgTable, uuid, text, boolean, timestamp, unique, index } from 'drizzle-orm/pg-core'

import { workspaces } from './workspace.schema'
import { users } from './users.schema'

export const projectStatusEnum = pgEnum('project_status', ['active', 'inactive'])

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    status: projectStatusEnum('status').notNull().default('active'),
    isDeleted: boolean('is_deleted').notNull().default(false), // Soft delete flag
    deletedBy: text('deleted_by').references(() => users.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdBy: text('created_by')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

export const projectAccess = pgTable(
    'project_access',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        projectId: uuid('project_id')
            .notNull()
            .references(() => projects.id, { onDelete: 'cascade' }),
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        grantedBy: text('granted_by')
            .notNull()
            .references(() => users.id),
        grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
        isOwner: boolean('is_owner').notNull().default(false)
    },
    (table) => [
        {
            uniqueUserProject: unique().on(table.projectId, table.userId),
            projectIdx: index('idx_project_access_project').on(table.projectId),
            userIdx: index('idx_project_access_user').on(table.userId)
        }
    ]
)
