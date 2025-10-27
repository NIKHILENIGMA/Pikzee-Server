import { Request, Response } from 'express'

import { AsyncHandler } from '@/lib'
import {
    createProjectSchema,
    projectIdSchema,
    updateProjectSchema,
    ValidationService,
    projectBodySchema,
    projectAccessSchema,
    projectQuerySchemaType
} from '@/shared'
import { ApiResponse, BadRequestError, ConflictError, DatabaseError, ForbiddenError, NotFoundError, UnauthorizedError } from '@/util'

import { CreateProjectInput, UpdateProjectInput } from './project.types'
import { GrantProjectAccessResponseDto, ProjectResponseDto, ProjectsResponseDto } from './project.dto'
import { ProjectService } from './project.service'

/**
 * Creates a new project for the authenticated user within a workspace.
 *
 * Validates the incoming request body, enforces the user's plan limit for projects
 * per workspace, persists the new project via ProjectService, and responds with
 * the created project DTO.
 *
 * @param req - Express Request object. Expects:
 *   - req.user?.id: string (authenticated user id)
 *   - req.tier?.projectsPerWorkspaceLimit: number (max projects allowed per workspace for the user's tier)
 *   - req.body: validated against `createProjectSchema` and shaped as `CreateProjectInput` ({ name, workspaceId })
 * @param res - Express Response object used to send the HTTP response.
 *
 * @returns A Promise that resolves when the ApiResponse has been sent. On success,
 *   sends a 201 Created response with payload: { project: ProjectResponseDto }.
 *
 * @throws UnauthorizedError If no authenticated user id is present on the request.
 * @throws ForbiddenError If the user's tier does not provide a project limit or
 *   the workspace already contains the maximum allowed projects for the user's plan.
 * @throws ValidationError If request body validation fails via ValidationService.validateBody.
 * @throws DatabaseError If creating the project in the database fails.
 *
 * @remarks
 * - Side effects: creates a persistent project record via ProjectService.createProject.
 * - Relies on helper services/middlewares: AsyncHandler, ValidationService, ProjectService, ApiResponse.
 *
 * @example
 *  POST /projects
 *  Request body: { "name": "New Project", "workspaceId": "workspace_abc" }
 */
export const createProject = AsyncHandler(async (req: Request, res: Response) => {
    // Get authenticated user
    const userId: string | undefined = req.user?.id
    if (!userId) throw new UnauthorizedError('User id is required')

    // Get project limit from user tier
    const projectLimit: number | undefined = req.tier?.projectsPerWorkspaceLimit
    if (!projectLimit) throw new ForbiddenError('Project limit not found for user tier')

    // Validate request body
    const { name: projectName, workspaceId }: CreateProjectInput = ValidationService.validateBody(req.body, createProjectSchema)

    // Check existing projects count against limit
    const existingProjectsCount = await ProjectService.countProjectsByUserIdAndWorkspaceId(userId, workspaceId)
    if (existingProjectsCount >= projectLimit) {
        throw new ForbiddenError(`Project limit of ${projectLimit} reached for your current plan`)
    }

    // Create project
    const newProject = await ProjectService.createProject({
        name: projectName,
        workspaceId,
        userId
    })
    if (!newProject) throw new DatabaseError('Failed to create project', 'controller:createProject')

    // Prepare response
    const projectResponse: ProjectResponseDto = {
        project: {
            id: newProject.id,
            name: newProject.name,
            workspaceId: newProject.workspaceId,
            status: newProject.status,
            createdBy: newProject.createdBy,
            createdAt: newProject.createdAt
        }
    }

    // Send response
    return ApiResponse(req, res, 201, 'Project created successfully', projectResponse)
})

export const updateProject = AsyncHandler(async (req: Request, res: Response) => {
    // Get authenticated user
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User id is required')

    // Get project id from middleware
    const projectId = req.project?.id
    if (!projectId) throw new BadRequestError('Project id is required')

    // Extract and validate request body
    const { name, status, workspaceId }: UpdateProjectInput = ValidationService.validateBody(req.body, updateProjectSchema)

    // Update project
    const updatedProject = await ProjectService.updateProject(projectId, userId, workspaceId, {
        name,
        status
    })

    // Prepare response
    const projectResponse: ProjectResponseDto = {
        project: {
            id: updatedProject.id,
            name: updatedProject.name,
            workspaceId: updatedProject.workspaceId,
            status: updatedProject.status,
            createdBy: updatedProject.createdBy,
            createdAt: updatedProject.createdAt
        }
    }

    // Send response
    return ApiResponse(req, res, 200, 'Project updated successfully', projectResponse)
})

export const softDeleteProject = AsyncHandler(async (req: Request, res: Response) => {
    // Get authenticated user
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User id is required')

    // Get project id from middleware
    const projectId = req.project?.id
    if (!projectId) throw new BadRequestError('Project id is required')

    // Validate request body
    const { workspaceId } = ValidationService.validateBody(req.body, projectBodySchema)
    if (!workspaceId) throw new NotFoundError('Workspace id is required')

    // Soft delete project
    const deletedProject = await ProjectService.softDeleteProject(projectId, userId, workspaceId)

    // Prepare response
    const projectResponse: ProjectResponseDto = {
        project: {
            id: deletedProject.id,
            name: deletedProject.name,
            workspaceId: deletedProject.workspaceId,
            status: deletedProject.status,
            createdBy: deletedProject.createdBy,
            createdAt: deletedProject.createdAt
        }
    }

    // Send response
    return ApiResponse(req, res, 200, 'Project deleted successfully', projectResponse)
})

export const hardDeleteProject = AsyncHandler(async (req: Request, res: Response) => {
    // Get authenticated user
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User id is required')
    // Get project id from middleware
    const projectId = req.project?.id
    if (!projectId) throw new BadRequestError('Project id is required')

    // Hard delete project
    const deletedProject = await ProjectService.permanentDeleteProject(projectId, userId)
    if (!deletedProject) throw new NotFoundError('Project not found')

    // Prepare response
    const projectResponse: ProjectResponseDto = {
        project: {
            id: deletedProject.id,
            name: deletedProject.name,
            workspaceId: deletedProject.workspaceId,
            status: deletedProject.status,
            createdBy: deletedProject.createdBy,
            createdAt: deletedProject.createdAt
        }
    }

    // Send response
    return ApiResponse(req, res, 200, 'Project deleted successfully', projectResponse)
})

export const getProjectById = AsyncHandler(async (req: Request, res: Response) => {
    // Get authenticated user
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')

    // Validate request params and body
    const { projectId } = ValidationService.validateParams(req.params, projectIdSchema)
    const { workspaceId } = ValidationService.validateBody(req.body, projectBodySchema)

    // Fetch project
    const project = await ProjectService.getProjectById({ projectId, userId, workspaceId })
    if (!project) throw new NotFoundError('Project not found')

    // Prepare response
    const projectResponse: ProjectResponseDto = {
        project: {
            id: project.id,
            name: project.name,
            workspaceId: project.workspaceId,
            status: project.status,
            createdBy: project.createdBy,
            createdAt: project.createdAt
        }
    }

    // Send response
    return ApiResponse(req, res, 200, 'Project fetched successfully', projectResponse)
})

export const listProjectsByWorkspace = AsyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')

    // Validate request body
    const { workspaceId } = ValidationService.validateBody(req.body, projectBodySchema)

    // Validate query params for pagination (this will set defaults if not provided)
    const page: number = ValidationService.validateQuery(req.query, projectQuerySchemaType).page
    const limit: number = ValidationService.validateQuery(req.query, projectQuerySchemaType).limit

    // Fetch projects
    const projects = await ProjectService.listProjectsByWorkspaceId({
        workspaceId,
        userId,
        page,
        limit
    })

    const projectListResponse: ProjectsResponseDto = {
        projects: projects.map((project) => ({
            id: project.id,
            name: project.name,
            workspaceId: project.workspaceId,
            status: project.status,
            createdBy: project.createdBy,
            createdAt: project.createdAt,
            hasAccess: project.isAllowed
        }))
    }

    // Send response
    return ApiResponse(req, res, 200, 'Projects fetched successfully', projectListResponse)
})

// Access Management Controllers
export const grantMemberProjectAccess = AsyncHandler(async (req: Request, res: Response) => {
    // Get authenticated user
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')

    // Get project id from middleware
    const projectId = req.project?.id
    if (!projectId) throw new BadRequestError('Project id is required')

    // Validate request body and params
    const { userId: grantUserId } = ValidationService.validateBody(req.body, projectAccessSchema)

    // Process granting access
    const grantedAccess = await ProjectService.grantProjectAccess(projectId, grantUserId, userId)
    if (!grantedAccess) throw new ConflictError('Failed to grant project access')

    // Prepare response
    const projectAccessResponse: GrantProjectAccessResponseDto = {
        access: {
            id: grantedAccess.id,
            userId: grantedAccess.userId,
            projectId: grantedAccess.projectId,
            isOwner: grantedAccess.isOwner
        }
    }

    // Send response
    return ApiResponse(req, res, 200, 'Project access granted successfully', projectAccessResponse)
})

export const revokeMemberProjectAccess = AsyncHandler(async (req: Request, res: Response) => {
    // Get authenticated user
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedError('User not authenticated')

    // Get project id from middleware
    const projectId = req.project?.id
    if (!projectId) throw new BadRequestError('Project id is required')

    // Validate request params and body
    const { userId: revokeUserId } = ValidationService.validateBody(req.body, projectAccessSchema)

    // Process revoking access
    const revokedProjectAccess = await ProjectService.revokeProjectAccess(projectId, revokeUserId, userId)
    if (!revokedProjectAccess) throw new NotFoundError('Project access not found or could not be revoked')

    // Prepare response
    const projectAccessResponse: GrantProjectAccessResponseDto = {
        access: {
            id: revokedProjectAccess.id,
            userId: revokedProjectAccess.userId,
            projectId: revokedProjectAccess.projectId,
            isOwner: false
        }
    }

    return ApiResponse(req, res, 200, 'Project access revoked successfully', projectAccessResponse)
})
