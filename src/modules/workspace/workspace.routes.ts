import { Router } from 'express'
import { clerkAuth } from '../../core/auth/clerk'
import * as controller from './workspace.controller'

export const workspaceRouter = Router()

workspaceRouter.post('/', clerkAuth, controller.createWorkspace)
