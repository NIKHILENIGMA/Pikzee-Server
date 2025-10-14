import { Router } from 'express'
import * as workspaceMemberController from './workspace-memeber.controller'
import { attachUserAndTier } from '@/middlewares/checkTier.middleware'
import { clerkAuth } from '@/core/auth/clerk'

const router = Router({ mergeParams: true })

//GET /api/workspaces/:workspaceId/members
router
    .route('/members')
    .get(clerkAuth, workspaceMemberController.getWorkspaceMembers)
    .post(clerkAuth, attachUserAndTier, workspaceMemberController.addMemberToWorkspace)

router.route('/members/leave').delete(clerkAuth, workspaceMemberController.existMemberFromWorkspace)

router
    .route('/members/:memberId')
    .patch(clerkAuth, workspaceMemberController.updateMemberPermission)
    .delete(clerkAuth, workspaceMemberController.removeMemberFromWorkspace)

export default router
