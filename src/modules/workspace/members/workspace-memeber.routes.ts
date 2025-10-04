import { Router } from 'express'
import * as workspaceMemberController from './workspace-memeber.controller'

const router = Router({ mergeParams: true })

//GET /api/workspaces/:workspaceId/members
router.route('/members').get(workspaceMemberController.getWorkspaceMembers).post(workspaceMemberController.addWorkspaceMember)

router.route('/members/:memberId').get(workspaceMemberController.updateMemberPermission).post(workspaceMemberController.removeWorkspaceMember)

router.route('/leave').patch(workspaceMemberController.updateMemberPermission)

export default router
