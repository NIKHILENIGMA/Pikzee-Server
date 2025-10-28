import { AsyncHandler } from '@/lib'
import { ApiResponse, BadRequestError, InternalServerError, UnauthorizedError } from '@/util'
import { Request, Response } from 'express'
import { IntergrationService } from './social.service'
import { google } from 'googleapis'
import { oauth2Client } from '@/core/storage/google.client'
// import fs from 'fs'
// import path from 'path'
// import fetch from 'node-fetch'
// import FormData from 'form-data'
// import { logger } from '@/config/logger'

export const connectionStatus = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const account = await IntergrationService.getConnectionStatus(userId)

    if (!account || !account.isConnected) {
        return ApiResponse(req, res, 200, 'Connected to YouTube', {
            connected: false
        })
    }

    return ApiResponse(req, res, 200, 'Connected to YouTube', {
        connected: true,
        channelTitle: account.channelTitle,
        channelId: account.channelId
    })
})

export const initiateYoutubeOAuth = (req: Request, res: Response) => {
    const userId = req.user?.id

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
        state: userId,
        prompt: 'consent'
    })

    return ApiResponse(req, res, 200, 'OAuth URL generated', {
        url: authUrl
    })
}

export const handleYoutubeOAuthCallback = AsyncHandler(async (req: Request, res: Response) => {
    const { code, state: userId } = req.query as { code?: string; state?: string }
    if (!code) throw new BadRequestError('Authorization code is missing')
    if (!userId) throw new BadRequestError('State parameter is missing')

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get channel information
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client })
    const channelResponse = await youtube.channels.list({
        part: ['snippet'],
        mine: true
    })

    const channel = channelResponse.data.items?.[0]

    // Save or update account
    const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000))
    const existingAccount = await IntergrationService.checkAccountExist(userId)

    // Update or create account record
    if (existingAccount) {
        const updatedAccount = await IntergrationService.updateYouTubeAccount(userId, {
            accessToken: tokens.access_token || existingAccount.accessToken,
            refreshToken: tokens.refresh_token || existingAccount.refreshToken,
            expiresAt,
            channelId: channel?.id || existingAccount.channelId,
            channelTitle: channel?.snippet?.title || existingAccount.channelTitle,
            isConnected: true
        })
        if (!updatedAccount) {
            throw new InternalServerError('Failed to update YouTube account')
        }
    } else {
        await IntergrationService.createYouTubeAccount({
            userId,
            accessToken: tokens.access_token || '',
            refreshToken: tokens.refresh_token || '',
            expiresAt,
            channelId: channel?.id || '',
            channelTitle: channel?.snippet?.title || '',
            isConnected: true
        })
    }

    return ApiResponse(req, res, 200, 'YouTube account connected successfully', {
        success: true
    })
})

export const disconnectYoutubeAccount = AsyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')

    await IntergrationService.updateYouTubeAccount(userId, { isConnected: false })

    return ApiResponse(req, res, 200, 'YouTube account disconnected successfully', {
        disconnected: true
    })
})

interface CompleteUploadReqBody {
    uploadId?: string
    videoId?: string
    error?: string
}

export const completeResumableUpload = AsyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { uploadId, videoId, error } = req.body as CompleteUploadReqBody

    if (!uploadId) {
        throw new BadRequestError('uploadId is required')
    }

    if (error) {
        // Mark upload as failed
        await IntergrationService.updateVideoUploadStatus(uploadId, 'failed', error)
    } else if (videoId) {
        // Mark upload as completed
        await IntergrationService.updateVideoUploadStatus(uploadId, 'completed', undefined, videoId)
    }

    return ApiResponse(req, res, 200, 'Upload status updated successfully', {
        success: true
    })
})

// optional
// export const getUploadHistory = AsyncHandler(async (req: Request, res: Response) => {})
