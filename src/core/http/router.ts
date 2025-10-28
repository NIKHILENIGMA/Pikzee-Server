import { Router } from 'express'
// import workspaceRouter from '@/modules/workspace/workspace.routes'
import { projectRouter, authRouter, workspaceRouter, socialRouter } from '@/modules'

const router = Router()

router.use('/auth', authRouter)
router.use('/workspaces', workspaceRouter)
router.use('/projects', projectRouter)
router.use('/integrations', socialRouter)

export default router
