import { Router } from 'express'
// import workspaceRouter from '@/modules/workspace/workspace.routes'
import { projectRouter, authRouter, workspaceRouter } from '@/modules'

const router = Router()

router.use('/auth', authRouter)
router.use('/workspaces', workspaceRouter)
router.use('/projects', projectRouter)

export default router
