import { Router } from 'express'
import bodyParser from 'body-parser'
import * as AuthController from './auth.controller'

const router = Router()

router.post('/auth/webhooks/register', bodyParser.raw({ type: 'application/json' }), AuthController.onboardingUser)

export default router
