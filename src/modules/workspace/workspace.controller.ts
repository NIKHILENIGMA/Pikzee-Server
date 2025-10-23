import { getAuth } from '@clerk/express'
import { and, eq } from 'drizzle-orm'
import { Request, Response } from 'express'

import { db, tiers, users, workspaceMembers, workspaces } from '@/core'
import { AsyncHandler } from '@/lib'
import { createWorkspaceSchema, updateWorkspaceSchema, WorkspaceIdSchema, ValidationService } from '@/shared'
import { ApiResponse, BadRequestError, NotFoundError, UnauthorizedError } from '@/util'

import { CreateWorkspaceBody } from './workspaces.types'
import { WorkspaceMemberDto, WorkspaceResponseDto, WorkspacesResponseDto, WorkspaceStorageResponseDto } from './workspace.dto'

// Creates a new workspace owned by the authenticated user. Each user can only create ONE workspace.
export const createWorkspace = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) {
        throw new UnauthorizedError('User not authenticated')
    }

    // Validate request body
    const { name }: CreateWorkspaceBody = ValidationService.validateBody(req.body, createWorkspaceSchema)

    // Check if the user already owns a workspace
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1)
    if (workspace) {
        throw new BadRequestError('User can only create one workspace')
    }

    // Create the workspace
    const newWorkspace = await db.transaction(async (tx) => {
        const [workspace] = await tx
            .insert(workspaces)
            .values({
                name: `${name}'s Workspace`,
                slug: name.toLowerCase().replace(/\s+/g, '-'),
                ownerId: userId,
                workspaceLogoUrl: null,
                currentStorageBytes: 0
            })
            .returning({
                id: workspaces.id,
                name: workspaces.name,
                slug: workspaces.slug,
                ownerId: workspaces.ownerId,
                currentStorageBytes: workspaces.currentStorageBytes,
                createdAt: workspaces.createdAt
            })

        // Add the owner as a member with full access
        await tx.insert(workspaceMembers).values({
            workspaceId: workspace.id,
            userId: userId,
            permission: 'FULL_ACCESS'
        })

        return workspace
    })

    const workspaceResponse: WorkspaceResponseDto = {
        workspace: {
            id: newWorkspace.id,
            name: newWorkspace.name,
            ownerId: newWorkspace.ownerId,
            workspaceLogoUrl: null,
            createdAt: newWorkspace.createdAt
        }
    }

    return ApiResponse(req, res, 201, 'Workspace created successfully', workspaceResponse)
})

// Updates workspace name and slug.
export const updateWorkspace = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) {
        throw new UnauthorizedError('User not authenticated')
    }
    const { workspaceId } = ValidationService.validateParams(req.params, WorkspaceIdSchema)
    const { name } = ValidationService.validateBody(req.body, updateWorkspaceSchema)

    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)

    if (!workspace) {
        throw new NotFoundError('Workspace not found')
    }

    if (workspace.ownerId !== userId) {
        throw new BadRequestError('Only the owner can update the workspace')
    }

    function generateSlug(name: string): string {
        return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() // simple slug generation
    }

    const newSlug = generateSlug(name || workspace.name)

    // Check if the new slug is already in use
    const [doesSlugExist] = await db.select().from(workspaces).where(eq(workspaces.slug, newSlug)).limit(1)
    if (doesSlugExist) {
        throw new BadRequestError('Slug already in use, please choose a different name')
    }

    // Update the workspace
    const [updatedWorkspace] = await db
        .update(workspaces)
        .set({
            name: name || workspace.name,
            slug: newSlug,
            updatedAt: new Date()
        })
        .where(eq(workspaces.id, workspaceId))
        .returning({
            id: workspaces.id,
            name: workspaces.name,
            slug: workspaces.slug,
            ownerId: workspaces.ownerId
        })

    const workspaceResponse: WorkspaceResponseDto = {
        workspace: {
            id: updatedWorkspace.id,
            name: updatedWorkspace.name,
            ownerId: updatedWorkspace.ownerId,
            workspaceLogoUrl: null,
            createdAt: workspace.createdAt
        }
    }

    return ApiResponse(req, res, 200, 'Workspace updated successfully', workspaceResponse)
})

// Retrieves all workspaces where the user is owner or member.
export const getUserWorkspaces = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) {
        throw new UnauthorizedError('User not authenticated')
    }

    const workspacesList = await db
        .select({
            id: workspaces.id,
            name: workspaces.name,
            ownerId: workspaces.ownerId,
            workspaceLogo: workspaces.workspaceLogoUrl,
            permission: workspaceMembers.permission,
            joinedAt: workspaceMembers.joinedAt
        })
        .from(workspaces)
        .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, userId))

    if (!workspacesList || workspacesList.length === 0) {
        throw new NotFoundError('No workspaces found for this user')
    }

    const workspacesResponse: WorkspacesResponseDto = {
        workspaces: workspacesList.map((ws) => ({
            id: ws.id,
            name: ws.name,
            ownerId: ws.ownerId,
            workspaceLogoUrl: ws.workspaceLogo,
            permission: ws.permission,
            createdAt: ws.joinedAt
        }))
    }

    return ApiResponse(req, res, 200, 'Workspaces retrieved successfully', workspacesResponse)
})

// Retrieves detailed information about a specific workspace.
export const getWorkspaceById = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) {
        throw new UnauthorizedError('User not authenticated')
    }

    const { workspaceId } = ValidationService.validateParams(req.params, WorkspaceIdSchema)

    const [membership] = await db
        .select({
            permission: workspaceMembers.permission,
            joinedAt: workspaceMembers.joinedAt
        })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
        .limit(1)

    if (!membership) {
        throw new UnauthorizedError('Access denied: You are not a member of this workspace')
    }

    // Check if the user is a member of the workspace
    const [workspaceData] = await db
        .select({
            workspace: {
                id: workspaces.id,
                name: workspaces.name,
                slug: workspaces.slug,
                ownerId: workspaces.ownerId,
                workspaceLogo: workspaces.workspaceLogoUrl,
                createdAt: workspaces.createdAt
            },
            owner: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                avatar: users.avatarImage
            }
        })
        .from(workspaces)
        .innerJoin(users, eq(workspaces.ownerId, users.id))
        .where(eq(workspaces.id, workspaceId))
        .limit(1)

    if (!workspaceData) {
        throw new NotFoundError('Workspace not found')
    }
    // Get workspace members
    const members = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarImage,

            memberId: workspaceMembers.id,
            permission: workspaceMembers.permission,
            joinedAt: workspaceMembers.joinedAt
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id)) // Join with users table to get user details
        .where(eq(workspaceMembers.workspaceId, workspaceId)) // Filter by workspace ID

    const workspaceResponse: WorkspaceResponseDto = {
        workspace: {
            id: workspaceData.workspace.id,
            name: workspaceData.workspace.name,
            ownerId: workspaceData.workspace.ownerId,
            workspaceLogoUrl: workspaceData.workspace.workspaceLogo,
            createdAt: workspaceData.workspace.createdAt,
            members: members.map(
                (m): WorkspaceMemberDto => ({
                    memberId: m.memberId,
                    userId: m.id,
                    permission: m.permission,
                    avatar: m.avatarUrl,
                    joinedAt: m.joinedAt
                })
            )
        }
    }

    return ApiResponse(req, res, 200, 'Workspace retrieved successfully', workspaceResponse)
})

// Retrieves detailed storage usage breakdown for the workspace.
export const getWorkspaceStorageUsage = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) {
        throw new UnauthorizedError('User not authenticated')
    }

    const { workspaceId } = ValidationService.validateParams(req.params, WorkspaceIdSchema)

    // Verify that the user is a member of the workspace
    const [workspace] = await db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))
        .limit(1)
    if (!workspace) {
        throw new NotFoundError('Workspace not found')
    }

    // Check if the user is a member of the workspace
    const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
        .limit(1)

    if (!membership) {
        throw new UnauthorizedError('Access denied: You are not a member of this workspace')
    }

    const [subscriptionTier] = await db
        .select({
            storageLimitBytes: tiers.storageLimitBytes
        })
        .from(users)
        .innerJoin(tiers, eq(users.tierId, tiers.id))
        .where(eq(users.id, userId))
        .limit(1)

    if (!subscriptionTier) {
        throw new NotFoundError('Subscription tier not found')
    }

    const workspaceResponse: WorkspaceStorageResponseDto = {
        id: workspace.id,
        name: workspace.name,
        currentStorageBytes: workspace.currentStorageBytes,
        storageLimitBytes: subscriptionTier ? subscriptionTier.storageLimitBytes : 0,
        usagePercentage:
            subscriptionTier && subscriptionTier.storageLimitBytes > 0
                ? Math.min(100, (workspace.currentStorageBytes / subscriptionTier.storageLimitBytes) * 100)
                : 0
    }

    return ApiResponse(req, res, 200, 'Storage usage retrieved successfully', workspaceResponse)
})
