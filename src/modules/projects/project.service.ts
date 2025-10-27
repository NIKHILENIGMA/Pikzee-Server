import { db, projectAccess, projects, users, workspaces } from '@/core'
import { and, count, desc, eq } from 'drizzle-orm'

import { BadRequestError, ConflictError, InternalServerError, NotFoundError, StandardError } from '@/util'

import { Project, ProjectAccess } from './project.types'

interface CreateProjectOpts {
    name: string
    workspaceId: string
    userId: string
}

export class ProjectService {
    // Command Operations
    public static async createProject(opts: CreateProjectOpts): Promise<Project> {
        const newProject = await db.transaction(async (tx) => {
            const [isNameAlreadyTaken] = await tx.select().from(projects).where(eq(projects.name, opts.name))

            if (isNameAlreadyTaken) {
                throw new ConflictError('Project name is already taken in this workspace', 'service:createProject')
            }

            const [createProject] = await tx
                .insert(projects)
                .values({
                    name: opts.name,
                    workspaceId: opts.workspaceId,
                    createdBy: opts.userId,
                    status: 'active'
                })
                .returning({
                    id: projects.id,
                    name: projects.name,
                    workspaceId: projects.workspaceId,
                    status: projects.status,
                    createdBy: projects.createdBy,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt
                })

            await tx.insert(projectAccess).values({
                isOwner: true,
                projectId: createProject.id,
                userId: opts.userId,
                grantedBy: opts.userId,
                grantedAt: new Date()
            })

            return createProject as Project
        })

        return newProject
    }

    public static async updateProject(projectId: string, createdBy: string, workspaceId: string, data: Partial<Project>): Promise<Project> {
        try {
            return await db.transaction(async (tx) => {
                // Verify that the user is the owner of the project
                const [hasAccess] = await tx
                    .select()
                    .from(projectAccess)
                    .where(and(eq(projectAccess.userId, createdBy), eq(projectAccess.projectId, projectId)))

                // Check if the user has access
                if (!hasAccess || !hasAccess.isOwner) {
                    throw new BadRequestError('Only project owners can update the project', 'service:updateProject')
                }

                // Perform update
                const [updatedProject] = await tx
                    .update(projects)
                    .set({ ...data, updatedAt: new Date() })
                    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
                    .returning()

                if (!updatedProject) {
                    throw new BadRequestError('Project not found or no changes made', 'service:updateProject')
                }
                return updatedProject
            })
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(`Failed to update project: ${(error as Error)?.message}`, 'service:updateProject')
        }
    }

    public static async softDeleteProject(projectId: string, deletedBy: string, workspaceId: string): Promise<Project> {
        try {
            return await db.transaction(async (tx) => {
                // Verify that the user is the owner of the project
                const [hasAccess] = await tx
                    .select()
                    .from(projectAccess)
                    .where(and(eq(projectAccess.userId, deletedBy), eq(projectAccess.projectId, projectId), eq(projectAccess.isOwner, true)))

                // Check if the user has access
                if (!hasAccess || !hasAccess.isOwner) {
                    throw new BadRequestError('Only project owners can delete the project', 'service:softDeleteProject')
                }

                // Perform soft delete
                const [deletedProject] = await tx
                    .update(projects)
                    .set({ deletedAt: new Date(), deletedBy: deletedBy, isDeleted: true })
                    .where(and(eq(projects.id, projectId), eq(projects.isDeleted, false), eq(projects.workspaceId, workspaceId)))
                    .returning()

                if (!deletedProject) {
                    throw new BadRequestError('Project not found or already deleted', 'service:softDeleteProject')
                }

                // Return the deleted project
                return deletedProject
            })
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(`Failed to soft delete project: ${(error as Error)?.message}`, 'service:softDeleteProject')
        }
    }

    public static async permanentDeleteProject(projectId: string, userId: string): Promise<Project> {
        try {
            return await db.transaction(async (tx) => {
                const [existingProject] = await tx
                    .select()
                    .from(projects)
                    .where(and(eq(projects.id, projectId), eq(projects.isDeleted, false), eq(projects.createdBy, userId)))
                if (!existingProject) {
                    throw new BadRequestError('Project not found or not eligible for permanent deletion', 'service:permanentDeleteProject')
                }

                // Perform permanent delete
                const [removedProject] = await tx.delete(projects).where(eq(projects.id, projectId)).returning()
                if (!removedProject) {
                    throw new BadRequestError('Project not found or could not be deleted', 'service:permanentDeleteProject')
                }
                return removedProject
            })
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to remove project: ${(error as Error)?.message}`, 'service:permanentDeleteProject')
        }
    }

    public static async checkProjectNameUniqueness(name: string, workspaceId: string): Promise<boolean> {
        try {
            const [existingProject] = await db
                .select()
                .from(projects)
                .where(and(eq(projects.name, name), eq(projects.workspaceId, workspaceId)))

            return existingProject ? false : true
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(
                `Failed to check project name uniqueness: ${(error as Error)?.message}`,
                'service:checkProjectNameUniqueness'
            )
        }
    }

    public static async checkUserProjectAccess(userId: string, projectId: string): Promise<boolean> {
        try {
            const [access] = await db
                .select()
                .from(projectAccess)
                .where(and(eq(projectAccess.userId, userId), eq(projectAccess.projectId, projectId)))

            return !!access
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to check user project access: ${(error as Error)?.message}`, 'service:checkUserProjectAccess')
        }
    }

    public static async grantProjectAccess(projectId: string, userId: string, grantedBy: string): Promise<ProjectAccess> {
        try {
            return await db.transaction(async (tx) => {
                const [user] = await tx.select().from(users).where(eq(users.id, userId))
                if (!user) {
                    throw new NotFoundError('User not found', 'service:grantProjectAccess')
                }

                // Check if the user already has access
                const [existingAccess] = await tx
                    .select()
                    .from(projectAccess)
                    .where(and(eq(projectAccess.userId, userId), eq(projectAccess.projectId, projectId)))

                if (existingAccess) {
                    throw new BadRequestError('User already has access to the project', 'service:grantProjectAccess')
                }

                // Verify that the grantedBy user is an owner of the project
                const [isProjectOwner] = await tx
                    .select()
                    .from(projectAccess)
                    .where(and(eq(projectAccess.userId, grantedBy), eq(projectAccess.projectId, projectId), eq(projectAccess.isOwner, true)))

                if (!isProjectOwner) {
                    throw new BadRequestError('Only project owners can grant access', 'service:grantProjectAccess')
                }

                // Grant access to the user
                const [access] = await tx
                    .insert(projectAccess)
                    .values({
                        projectId,
                        userId,
                        grantedBy,
                        grantedAt: new Date(),
                        isOwner: false
                    })
                    .returning()
                return access as ProjectAccess
            })
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(`Failed to grant project access: ${(error as Error)?.message}`, 'service:grantProjectAccess')
        }
    }

    public static async revokeProjectAccess(projectId: string, revokeUserId: string, revokedBy: string): Promise<ProjectAccess> {
        try {
            return await db.transaction(async (tx) => {
                const [user] = await tx.select().from(users).where(eq(users.id, revokeUserId))
                if (!user) {
                    throw new NotFoundError('User not found', 'service:revokeProjectAccess')
                }
                // Verify that the revokedBy user is an owner of the project
                const [isProjectOwner] = await tx
                    .select()
                    .from(projectAccess)
                    .where(and(eq(projectAccess.userId, revokedBy), eq(projectAccess.projectId, projectId), eq(projectAccess.isOwner, true)))

                if (!isProjectOwner) {
                    throw new BadRequestError('Only project owners can revoke access', 'service:revokeProjectAccess')
                }

                // Check user is part of the project
                const [existingAccess] = await tx
                    .select()
                    .from(projectAccess)
                    .where(and(eq(projectAccess.userId, revokeUserId), eq(projectAccess.projectId, projectId)))
                if (!existingAccess) {
                    throw new BadRequestError('User does not have access to the project', 'service:revokeProjectAccess')
                }

                // Revoke access
                const [revokedAccess] = await tx
                    .delete(projectAccess)
                    .where(and(eq(projectAccess.userId, revokeUserId), eq(projectAccess.projectId, projectId)))
                    .returning()
                return revokedAccess as ProjectAccess
            })
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(`Failed to revoke project access: ${(error as Error)?.message}`, 'service:revokeProjectAccess')
        }
    }

    public static async countProjectsByUserIdAndWorkspaceId(userId: string, workspaceId: string): Promise<number> {
        try {
            return await db.transaction(async (tx) => {
                const [workspaceExists] = await tx
                    .select()
                    .from(workspaces)
                    .where(and(eq(workspaces.id, workspaceId)))
                if (!workspaceExists) {
                    throw new NotFoundError('Workspace not found', 'service:countProjectsByUserIdAndWorkspaceId')
                }

                const [numberOfProjects] = await tx
                    .select({
                        count: count(projects.id)
                    })
                    .from(projects)
                    .where(and(eq(projects.createdBy, userId), eq(projects.workspaceId, workspaceId)))

                return numberOfProjects.count
            })
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to count projects: ${(error as Error)?.message}`, 'service:countProjectsByUserIdAndWorkspaceId')
        }
    }

    // Query Operations
    public static async getProjectById(data: { projectId: string; userId: string; workspaceId: string }): Promise<Project | null> {
        try {
            const [project] = await db.transaction(async (tx) => {
                const [hasAccess] = await tx
                    .select()
                    .from(projectAccess)
                    .where(and(eq(projects.id, data.projectId), eq(projectAccess.userId, data.userId)))
                if (!hasAccess) {
                    throw new BadRequestError(
                        'User does not have access to the project, please ask project owner for access',
                        'service:getProjectById'
                    )
                }

                return await tx
                    .select()
                    .from(projects)
                    .where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId)))
            })

            return project
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }

            throw new InternalServerError(`Failed to get project by id: ${(error as Error)?.message}`, 'service:getProjectById')
        }
    }

    public static async doesProjectExist(id: string): Promise<Project | null> {
        try {
            const [project] = await db.select().from(projects).where(eq(projects.id, id))
            return project || null
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to check if project exists: ${(error as Error)?.message}`, 'service:doesProjectExist')
        }
    }

    public static async listProjectsByWorkspaceId({
        workspaceId,
        userId,
        page = 1,
        limit = 10
    }: {
        workspaceId: string
        userId: string
        page?: number
        limit?: number
    }): Promise<(Project & { isAllowed: boolean })[]> {
        try {
            const maxLimit = Math.min(Math.max(limit, 1), 100)

            const projectsList = await db
                .select({
                    id: projects.id,
                    name: projects.name,
                    workspaceId: projects.workspaceId,
                    status: projects.status,
                    isDeleted: projects.isDeleted,
                    deletedAt: projects.deletedAt,
                    deletedBy: projects.deletedBy,
                    createdBy: projects.createdBy,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt,
                    isAllowed: projectAccess.userId
                })
                .from(projects)
                .leftJoin(projectAccess, and(eq(projects.id, projectAccess.projectId), eq(projectAccess.userId, userId)))
                .where(and(eq(projects.workspaceId, workspaceId), eq(projects.isDeleted, false)))
                .orderBy(desc(projects.createdAt))
                .offset((page - 1) * maxLimit)
                .limit(maxLimit)

            return projectsList.map((project) => ({
                ...project,
                isAllowed: !!project.isAllowed
            }))
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to list projects by workspace: ${(error as Error)?.message}`, 'service:listProjectsByWorkspace')
        }
    }

    public static async listAllProjects(page: number = 1, limit: number = 10): Promise<Project[]> {
        try {
            const projectsList = await db
                .select()
                .from(projects)
                .offset((page - 1) * limit)
                .limit(limit)
            return projectsList
        } catch (error) {
            if (error instanceof StandardError) {
                throw error
            }
            throw new InternalServerError(`Failed to list all projects: ${(error as Error)?.message}`, 'service:listAllProjects')
        }
    }
}
