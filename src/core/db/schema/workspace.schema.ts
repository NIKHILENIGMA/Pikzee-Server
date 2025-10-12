import { pgTable, uuid, text, bigint, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

import { users } from './users.schema'
import { unique } from 'drizzle-orm/pg-core'

export type Permission = 'FULL_ACCESS' | 'EDIT' | 'COMMENT_ONLY' | 'VIEW_COMMENTS'

export const permissionEnum: Permission[] = ['FULL_ACCESS', 'EDIT', 'COMMENT_ONLY', 'VIEW_COMMENTS'] as const

// Workspaces Table
export const workspaces = pgTable('workspaces', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    ownerId: text('owner_id')
        .notNull()
        .references(() => users.id),
    currentStorageBytes: bigint('current_storage_bytes', { mode: 'number' }).notNull().default(0),
    workspaceLogoUrl: text('workspace_logo_url').default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

//
// Workspace Members Table
//
export const workspaceMembers = pgTable(
    'workspace_members',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        workspaceId: uuid('workspace_id')
            .notNull()
            .references(() => workspaces.id, { onDelete: 'cascade' }),
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        permission: text('permission').notNull().$type<(typeof permissionEnum)[number]>(),
        joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [unique('unique_workspace_user').on(table.workspaceId, table.userId)]
)

//
// Workspace Invitations Table
//

export const workspaceInvitations = pgTable('workspace_invitations', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    userId: text('user_id').references(() => users.id),
    status: text('status').notNull().default('PENDING'), // PENDING, ACCEPTED, EXPIRED
    permission: text('permission').notNull().$type<(typeof permissionEnum)[number]>(),
    invitedBy: text('invited_by')
        .notNull()
        .references(() => users.id),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    owner: one(users, {
        fields: [workspaces.ownerId],
        references: [users.id]
    }),
    members: many(workspaceMembers)
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [workspaceMembers.workspaceId],
        references: [workspaces.id]
    }),
    user: one(users, {
        fields: [workspaceMembers.userId],
        references: [users.id]
    })
}))

export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [workspaceInvitations.workspaceId],
        references: [workspaces.id]
    }),
    inviter: one(users, {
        fields: [workspaceInvitations.invitedBy],
        references: [users.id]
    })
}))
