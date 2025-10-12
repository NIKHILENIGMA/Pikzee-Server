import { Router } from 'express'
import { clerkAuth } from '../../core/auth/clerk'
import * as controller from './workspace.controller'
import membersRoutes from './members/workspace-memeber.routes'
import { attachUserAndTier } from '@/middlewares/checkTier.middleware'

const workspaceRouter = Router()

// Workspaces
workspaceRouter
    .route('/')
    .post(clerkAuth, attachUserAndTier, controller.createWorkspace) // Create new workspace
    .get(clerkAuth, controller.getUserWorkspaces) // Get all workspaces for user

workspaceRouter
    .route('/:workspaceId')
    .get(clerkAuth, controller.getWorkspaceById) // Get workspace by ID
    .patch(clerkAuth, controller.updateWorkspace) // Update workspace details

workspaceRouter.route('/:workspaceId/storage').get(clerkAuth, controller.getWorkspaceStorageUsage) // Get storage usage for workspace

workspaceRouter.use('/:workspaceId', clerkAuth, membersRoutes) // Workspace members routes

export default workspaceRouter
