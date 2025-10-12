import { getAuth } from '@clerk/express'
import { and, eq, count } from 'drizzle-orm'
import { Request, Response } from 'express'

import { db } from '@/core/db'
import { tiers, users } from '@/core/db/schema'
import { AsyncHandler } from '@/core/http/asyncHandler'
import { workspaceMembers, workspaces } from '@/core/db/schema/workspace.schema'

import { ApiResponse, BadRequestError, NotFoundError, UnauthorizedError } from '@/util'
import { ValidationService } from '../shared/validation.service'

import { createWorkspaceSchema, updateWorkspaceSchema, WorkspaceIdSchema } from './workspace.schema'
import { CreateWorkspaceBody } from './workspaces.types'

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
                currentStorageBytes: workspaces.currentStorageBytes
            })

        // Add the owner as a member with full access
        await tx.insert(workspaceMembers).values({
            workspaceId: workspace.id,
            userId: userId,
            permission: 'FULL_ACCESS'
        })

        return workspace
    })

    return ApiResponse(req, res, 201, 'Workspace created successfully', newWorkspace)
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
            slug: workspaces.slug,
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

    return ApiResponse(req, res, 200, 'Workspaces retrieved successfully', workspacesList)
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

    const [membersCountRow] = await db
        .select({
            noOfMembers: count(workspaceMembers.id)
        })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId))

    const noOfMembers = Number(membersCountRow?.noOfMembers ?? 0)

    const workspaceResponse = {
        workspace: workspaceData.workspace,
        owner: workspaceData.owner,
        numberOfMembers: noOfMembers,
        memeberShip: membership.permission
    }

    return ApiResponse(req, res, 200, 'Workspace retrieved successfully', workspaceResponse)
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

    return ApiResponse(req, res, 200, 'Workspace updated successfully', updatedWorkspace)
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

    const storageResponse = {
        currentStorageBytes: workspace.currentStorageBytes,
        storageLimitBytes: subscriptionTier ? subscriptionTier.storageLimitBytes : 0,
        usagePercentage:
            subscriptionTier && subscriptionTier.storageLimitBytes > 0
                ? Math.min(100, (workspace.currentStorageBytes / subscriptionTier.storageLimitBytes) * 100)
                : 0
    }

    return ApiResponse(req, res, 200, 'Storage usage retrieved successfully', storageResponse)
})
