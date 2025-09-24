import { Router } from 'express'
import { workspaceRouter } from '../../modules/workspace/workspace.routes'

export const router = Router()

router.use('/workspaces', workspaceRouter)
