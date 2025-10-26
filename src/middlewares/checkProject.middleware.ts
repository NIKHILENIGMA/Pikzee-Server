import { NextFunction, Request, Response } from 'express'

import { ProjectService } from '@/modules/projects/project.service'
import { projectIdSchema, ValidationService } from '@/shared'
import { NotFoundError } from '@/util'

export const attachedProjectMiddleware = async (req: Request, _: Response, next: NextFunction) => {
    try {
        const { projectId } = ValidationService.validateParams(req.params, projectIdSchema)
        const projectExists = await ProjectService.doesProjectExist(projectId)

        if (!projectExists) {
            throw new NotFoundError('Project does not exist')
        }

        req.project = projectExists

        next()
    } catch (error) {
        next(error)
    }
}
