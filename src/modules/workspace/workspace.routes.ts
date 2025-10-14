import { Router } from 'express'
import { clerkAuth } from '@/core/auth/clerk'
import { attachUserAndTier } from '@/middlewares/checkTier.middleware'

import membersRoutes from './members/workspace-memeber.routes'
import * as controller from './workspace.controller'

const workspaceRouter = Router({
    mergeParams: true
})

// Workspaces
workspaceRouter
    .route('/')
    .post(clerkAuth, attachUserAndTier, controller.createWorkspace) // Create new workspace
    .get(clerkAuth, controller.getUserWorkspaces) // Get all workspaces for user

workspaceRouter.route('/current-workspace').get(clerkAuth, controller.getLoggedInUserWorkspace) // Get current user's workspace

workspaceRouter
    .route('/:workspaceId')
    .get(clerkAuth, controller.getWorkspaceById) // Get workspace by ID
    .patch(clerkAuth, controller.updateWorkspace) // Update workspace details

workspaceRouter.route('/:workspaceId/storage').get(clerkAuth, controller.getWorkspaceStorageUsage) // Get storage usage for workspace

workspaceRouter.use('/:workspaceId', clerkAuth, membersRoutes) // Workspace members routes

export default workspaceRouter
