import { getAuth } from '@clerk/express'
import { and, eq } from 'drizzle-orm'
import { Request, Response } from 'express'

import { db } from '@/core/db'
import { AsyncHandler } from '@/core/http/asyncHandler'
import { workspaceMembers, workspaces } from '@/core/db/schema/workspace.schema'

import { ApiResponse, BadRequestError, NotFoundError, UnauthorizedError } from '@/util'
import { tiers, users } from '@/core/db/schema'
import { count } from 'drizzle-orm'

// Creates a new workspace owned by the authenticated user. Each user can only create ONE workspace.
export const createWorkspace = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) {
        throw new UnauthorizedError('User not authenticated')
    }

    // Extract and sanitize input
    const { name } = req.body as { name: string }

    // Validate input
    if (!name || typeof name !== 'string' || name.length < 3 || name.length > 50) {
        return ApiResponse(req, res, 400, 'Invalid workspace name', null)
    }

    // Check if the user already owns a workspace
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1)
    if (workspace) {
        throw new BadRequestError('User can only create one workspace')
    }

    // Create the workspace
    const [newWorkspace] = await db
        .insert(workspaces)
        .values({
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            ownerId: userId,
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
    await db.insert(workspaceMembers).values({
        workspaceId: newWorkspace.id,
        userId: userId,
        permission: 'FULL_ACCESS'
    })

    return ApiResponse(req, res, 200, 'Create Workspace - Not Implemented', newWorkspace)
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
    // - Validates user has access to workspace (owner or member)
    // - Queries workspace with owner information
    // - Includes member count and storage usage
    // - Returns workspace object with metadata

    const { userId } = getAuth(req)
    if (!userId) {
        throw new UnauthorizedError('User not authenticated')
    }

    const { workspaceId } = req.params as { workspaceId: string }
    if (!workspaceId || typeof workspaceId !== 'string') {
        throw new BadRequestError('Invalid workspace ID')
    }

    const [workspaceData] = await db
        .select({
            id: workspaces.id,
            name: workspaces.name,
            slug: workspaces.slug,
            ownerId: workspaces.ownerId,
            workspaceLogo: workspaces.workspaceLogoUrl,
            currentStorageBytes: workspaces.currentStorageBytes,
            permission: workspaceMembers.permission,
            createdAt: workspaces.createdAt,

            // owner info
            ownerFirstName: users.firstName,
            ownerLastName: users.lastName,
            ownerEmail: users.email,
            ownerProfileImageUrl: users.avatarImage,

            // User's permission level
            userPermission: workspaceMembers.permission,
            useJoinedAt: workspaceMembers.joinedAt
        })
        .from(workspaces)
        .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
        .innerJoin(users, eq(workspaces.ownerId, users.id))
        .where(and(eq(workspaces.id, workspaceId), eq(workspaceMembers.userId, userId)))
        .limit(1)

    if (!workspaceData) {
        throw new UnauthorizedError('Access denied: You are not a member of this workspace')
    }

    const [memberCount] = await db
        .select({
            count: count(workspaceMembers.id)
        })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId))

    const [userTier] = await db
        .select({
            storageLimitBytes: tiers.storageLimitBytes
        })
        .from(users)
        .innerJoin(tiers, eq(users.tierId, tiers.id))
        .where(eq(users.id, userId))

    const workspaceResponse = {
        workspace: {
            id: workspaceData.id,
            name: workspaceData.name,
            slug: workspaceData.slug,
            logo: workspaceData.workspaceLogo,
            createdAt: workspaceData.createdAt
        },
        owner: {
            id: workspaceData.ownerId,
            firstName: workspaceData.ownerFirstName,
            lastName: workspaceData.ownerLastName,
            email: workspaceData.ownerEmail,
            avatar: workspaceData.ownerProfileImageUrl
        },
        userAccess: {
            permission: workspaceData.userPermission,
            joinedAt: workspaceData.useJoinedAt,
            isOwner: workspaceData.ownerId === userId
        },
        stats: {
            memberCount: memberCount.count || 0,
            currentStorageBytes: workspaceData.currentStorageBytes,
            storageLimitBytes: userTier ? userTier.storageLimitBytes : 0
        }
    }

    return ApiResponse(req, res, 200, 'Workspace retrieved successfully', workspaceResponse)
})

// Updates workspace name and slug.
export const updateWorkspace = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) {
        throw new UnauthorizedError('User not authenticated')
    }

    const { workspaceId } = req.params as { workspaceId: string }
    if (!workspaceId || typeof workspaceId !== 'string') {
        throw new BadRequestError('Invalid workspace ID')
    }

    const { name } = req.body as { name?: string }
    if (!name) {
        throw new BadRequestError('At least one of name or slug must be provided')
    }

    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)

    if (!workspace) {
        throw new NotFoundError('Workspace not found')
    }

    if (workspace.ownerId !== userId) {
        throw new BadRequestError('Only the owner can update the workspace')
    }

    function generateSlug(name: string): string {
        return name.toLowerCase().replace(/\s+/g, '-') // simple slug generation
    }

    const [doesSlugExist] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, generateSlug(name)))
        .limit(1)
    if (doesSlugExist) {
        throw new BadRequestError('Slug already in use, please choose a different name')
    }

    const [updatedWorkspace] = await db
        .update(workspaces)
        .set({
            name: name || workspace.name,
            slug: generateSlug(name || workspace.name),
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

    const { workspaceId } = req.params as { workspaceId: string }
    if (!workspaceId || typeof workspaceId !== 'string') {
        throw new BadRequestError('Invalid workspace ID')
    }

    const [workspace] = await db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))
        .limit(1)
    if (!workspace) {
        throw new NotFoundError('Workspace not found')
    }

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
