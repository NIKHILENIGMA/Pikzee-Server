import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { pgTable, unique, text, timestamp, boolean, varchar, uuid } from 'drizzle-orm/pg-core'

export const youtubeAccounts = pgTable(
    'youtube_accounts',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: text('user_id').notNull(),
        accessToken: text('access_token').notNull(),
        refreshToken: text('refresh_token').notNull(),
        expiresAt: timestamp('expires_at').notNull(),
        channelId: text('channel_id').notNull(),
        channelTitle: text('channel_title').notNull(),
        isConnected: boolean('is_connected').default(true).notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull()
    },
    (table) => [
        {
            unique_youtube_user: unique('unique_youtube_user').on(table.userId, table.channelId)
        }
    ]
)

export const videoUploads = pgTable('video_uploads', {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    youtubeVideoId: varchar('youtube_video_id', { length: 255 }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).notNull(), // 'uploading', 'completed', 'failed'
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export type YouTubeAccount = InferSelectModel<typeof youtubeAccounts>
export type NewYouTubeAccount = InferInsertModel<typeof youtubeAccounts>

export type VideoUpload = InferSelectModel<typeof videoUploads>
export type NewVideoUpload = InferInsertModel<typeof videoUploads>
