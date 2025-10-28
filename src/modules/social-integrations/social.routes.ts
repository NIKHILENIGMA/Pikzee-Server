import { Router } from 'express'
import * as socialController from './social.controller'
import { attachUserAndTier } from '@/middlewares'

const router = Router()

// Get YouTube connection status
router.route('/social/youtube/status').get(attachUserAndTier, socialController.connectionStatus)

// Initiate YouTube OAuth
router.route('/social/youtube/connect').get(attachUserAndTier, socialController.initiateYoutubeOAuth)

// Callback URL for YouTube OAuth
router.route('/social/youtube/callback').post(attachUserAndTier, socialController.handleYoutubeOAuthCallback)

// Disconnect YouTube account (to be implemented)
router.route('/social/youtube/disconnect').post(attachUserAndTier, socialController.disconnectYoutubeAccount)

// Complete YouTube upload
router.route('/social/youtube/upload-complete').post(attachUserAndTier, socialController.completeResumableUpload)

export default router
