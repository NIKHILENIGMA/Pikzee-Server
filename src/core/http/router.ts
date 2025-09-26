import { Router } from 'express'
import { workspaceRouter } from '@/modules/workspace/workspace.routes'
import { authRouter } from '@/modules/auth'

export const router = Router()

router.use('/workspaces', workspaceRouter)
router.use('/auth', authRouter)
