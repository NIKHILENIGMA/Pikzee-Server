import { Router } from 'express'
import workspaceRouter from '@/modules/workspace/workspace.routes'
import { authRouter } from '@/modules/auth'

const router = Router()

router.use('/auth', authRouter)
router.use('/workspaces', workspaceRouter)

export default router
