import { eq } from 'drizzle-orm/sqlite-core/expressions'

import { db, NewYouTubeAccount, videoUploads, youtubeAccounts, type YouTubeAccount } from '@/core'
import { BadRequestError, InternalServerError, StandardError } from '@/util'
import { google } from 'googleapis'
// import { logger } from '@/config'

export class IntergrationService {
    public static async getConnectionStatus(userId: string): Promise<YouTubeAccount | null> {
        try {
            const [account] = await db.select().from(youtubeAccounts).where(eq(youtubeAccounts.userId, userId)).limit(1)

            return account || null
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(`Failed to get connection status: ${(error as Error)?.message}`, 'service:social:getConnectionStatus')
        }
    }

    public static async checkAccountExist(userId: string): Promise<YouTubeAccount | null> {
        try {
            const [account] = await db.select().from(youtubeAccounts).where(eq(youtubeAccounts.userId, userId)).limit(1)
            return account || null
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to check existing account: ${(error as Error)?.message}`, 'service:social:checkExistingAccount')
        }
    }

    public static async createYouTubeAccount(accountData: NewYouTubeAccount): Promise<void> {
        try {
            await db.insert(youtubeAccounts).values(accountData)
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(`Failed to create YouTube account: ${(error as Error)?.message}`, 'service:social:createYouTubeAccount')
        }
    }

    public static async updateYouTubeAccount(userId: string, accountData: Partial<YouTubeAccount>): Promise<boolean> {
        try {
            const result = await db.update(youtubeAccounts).set(accountData).where(eq(youtubeAccounts.userId, userId))
            return result ? true : false
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to update YouTube account: ${(error as Error)?.message}`, 'service:social:updateYouTubeAccount')
        }
    }

    public static async getValidAccessToken(userId: string, oauth2Client: InstanceType<typeof google.auth.OAuth2>) {
        // logger.info(`Getting valid access token for user: ${userId}`)
        try {
            const [account] = await db.select().from(youtubeAccounts).where(eq(youtubeAccounts.userId, userId)).limit(1)
            if (!account) {
                throw new BadRequestError('No YouTube account connected')
            }

            // still valid
            if (account.accessToken && account.expiresAt && new Date() < account.expiresAt) {
                // logger.info(`access token still valid for user: ${account.accessToken}`)
                return account.accessToken
            }

            // need to refresh
            if (!account.refreshToken) {
                throw new BadRequestError('No refresh token available; re-authentication required')
            }

            oauth2Client.setCredentials({ refresh_token: account.refreshToken })

            // refreshAccessToken returns { credentials } in many googleapis versions
            const { credentials } = await oauth2Client.refreshAccessToken()
            const newAccessToken = credentials.access_token!
            const newRefreshToken = credentials.refresh_token ?? account.refreshToken
            const newExpiresAt = credentials.expiry_date
                ? new Date(credentials.expiry_date)
                : new Date(Date.now() + (credentials.expiry_date ?? 3600) * 1000)

            await db
                .update(youtubeAccounts)
                .set({
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    expiresAt: newExpiresAt,
                    updatedAt: new Date()
                })
                .where(eq(youtubeAccounts.userId, userId))

            return newAccessToken
        } catch (err) {
            if (err instanceof StandardError) throw err
            throw new InternalServerError(`Failed to get valid access token: ${(err as Error)?.message}`, 'service:social:getValidAccessToken')
        }
    }

    // Upload video method can be added here
    public static async createVideoUpload({
        uploadId,
        userId,
        title,
        description
    }: {
        uploadId: string
        userId: string
        title: string
        description?: string
    }): Promise<void> {
        try {
            await db.insert(videoUploads).values({
                id: uploadId,
                userId: userId,
                title,
                description,
                status: 'uploading'
            })
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to create video upload record: ${(error as Error)?.message}`, 'service:social:createVideoUpload')
        }
    }

    public static async updateVideoUploadStatus(
        uploadId: string,
        status: 'uploading' | 'completed' | 'failed',
        errorMessage?: string,
        youtubeVideoId?: string
    ): Promise<void> {
        try {
            await db
                .update(videoUploads)
                .set({
                    status,
                    errorMessage: errorMessage || null,
                    updatedAt: new Date(),
                    youtubeVideoId: youtubeVideoId || null
                })
                .where(eq(videoUploads.id, uploadId))
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(
                `Failed to update video upload status: ${(error as Error)?.message}`,
                'service:social:updateVideoUploadStatus'
            )
        }
    }
}
