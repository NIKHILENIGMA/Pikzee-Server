import { AsyncHandler } from '@/lib'
import { ApiResponse, BadRequestError, InternalServerError, UnauthorizedError } from '@/util'
import { Request, Response } from 'express'
import { IntergrationService } from './social.service'
import { google, youtube_v3 } from 'googleapis'
import { oauth2Client } from '@/core/storage/google.client'
import fs from 'fs'
import axios from 'axios'

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

export const uploadVideoToYouTube = AsyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')
    // Validate request body
    const { title, description, privacyStatus, filePath } = req.body as {
        title: string
        description?: string
        privacyStatus?: 'public' | 'private' | 'unlisted'
        filePath: string
    }
    if (!title) {
        throw new BadRequestError('Video title is required')
    }
    if (!filePath) {
        throw new BadRequestError('Video file path is required')
    }

    // Prepare video metadata
    const videoMetadata: youtube_v3.Schema$Video = {
        snippet: {
            title,
            description: description || ''
        },
        status: {
            privacyStatus: privacyStatus || 'private'
        }
    }

    // Initialize OAuth2 client

    // Initialize YouTube API client
    const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
    })

    // Upload video
    const ytVideo = await youtube.videos.insert({
        part: ['snippet', 'status'],
        notifySubscribers: true, // Optional: Notify subscribers about the new video
        requestBody: videoMetadata,
        media: {
            body: fs.createReadStream(filePath) // In a real implementation, this should be a readable stream of the file
        }
    })

    //
    return ApiResponse(req, res, 200, 'Video upload initiated successfully', {
        uploadId: ytVideo.data,
        status: 'complete'
    })
})

export const initiateResumableUpload = AsyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { title, description, privacyStatus, fileSize, mimeType } = req.body as {
        title: string
        description?: string
        privacyStatus?: 'public' | 'private' | 'unlisted'
        fileSize: number
        mimeType: string
    }

    if (!title) {
        throw new BadRequestError('Video title is required')
    }

    await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,contentDetails',
        {
            snippet: {
                title,
                description: description || '',
                categoryId: '22' // People & Blogs
            },
            status: {
                privacyStatus: privacyStatus || 'private',
                embeddable: true,
                license: 'youtube'
            }
        },
        {
            headers: {
                Authorization: `Bearer ${oauth2Client.credentials.access_token}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Length': fileSize,
                'X-Upload-Content-Type': mimeType
            }
        }
    )

    // const uploadUrl = youtubeResponse.headers.location
    // if (!uploadUrl) {
    //     throw new InternalServerError('Failed to get upload URL from YouTube')
    // }

    return ApiResponse(req, res, 200, 'Resumable upload initiated successfully', {
        // uploadUrl: uploadUrl
    })
})

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
