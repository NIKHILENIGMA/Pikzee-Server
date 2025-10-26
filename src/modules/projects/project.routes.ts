import { Router } from 'express'
import * as projectController from './project.controllers'
import { attachUserAndTier } from '@/middlewares'
import { attachedProjectMiddleware } from '@/middlewares/checkProject.middleware'

const router = Router()

router.route('/').post(attachUserAndTier, projectController.createProject).get(attachUserAndTier, projectController.listProjectsByWorkspace)

router
    .route('/:projectId')
    .get(attachUserAndTier, attachedProjectMiddleware, projectController.getProjectById)
    .patch(attachUserAndTier, attachedProjectMiddleware, projectController.updateProject)
    .delete(attachUserAndTier, attachedProjectMiddleware, projectController.hardDeleteProject)

router.route('/:projectId/soft-delete').patch(attachUserAndTier, attachedProjectMiddleware, projectController.softDeleteProject)

router
    .route('/:projectId/grant-access')
    .post(attachUserAndTier, attachedProjectMiddleware, projectController.grantMemberProjectAccess)
    .patch(attachUserAndTier, attachedProjectMiddleware, projectController.revokeMemberProjectAccess)

export default router
