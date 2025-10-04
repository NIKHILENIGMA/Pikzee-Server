import { getAuth } from '@clerk/express'
import { Request, Response } from 'express'
import { and, count, eq } from 'drizzle-orm'

import { db } from '@/core/db'
import { Permission, workspaceMembers, workspaces } from '@/core/db/schema/workspace.schema'
import { users } from '@/core/db/schema'
import { AsyncHandler } from '@/core/http/asyncHandler'

import { ApiResponse, BadRequestError, UnauthorizedError } from '@/util'
import { TierService } from '@/modules/shared/tier.service'

// Retrieves all members of a workspace with their permissions.
export const getWorkspaceMembers = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId } = req.params as { workspaceId: string }

    // step 1 validate user has access to workspace
    const [userAccess] = await db
        .select({
            exists: workspaceMembers.id
        })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
        .limit(1)

    if (!userAccess) throw new BadRequestError('User does not have access to this workspace')

    // step 2 query workspace members with join to users table
    const members = await db
        .select({
            memeberId: workspaceMembers.id,
            permissions: workspaceMembers.permission,
            joinedAt: workspaceMembers.joinedAt,
            updatedAt: workspaceMembers.updatedAt,

            userId: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarImage: users.avatarImage,

            workspaceOwnerId: workspaces.ownerId
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, workspaceId))
        .orderBy(workspaceMembers.joinedAt)

    if (!members) throw new BadRequestError('No members found for this workspace')

    const membersWithPermissions = members.map((member) => ({
        id: member.userId,
        user: {
            id: member.userId,
            email: member.email,
            fullName: `${member.firstName} ${member.lastName}`,
            avatarImage: member.avatarImage
        },
        permissions: member.permissions,
        isOwner: member.userId === member.workspaceOwnerId,
        joinedAt: member.joinedAt
    }))

    return ApiResponse(req, res, 200, 'Succesfully retrieved workspace members', { members: membersWithPermissions })
})

// Adds an existing user to a workspace (after invitation acceptance).
export const addWorkspaceMember = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId } = req.params as { workspaceId: string }
    if (!workspaceId) throw new BadRequestError('Workspace ID is required')

    const { userToAddId, permission } = req.body as { userToAddId: string; permission: Permission }

    // step 1 validate user has access as owner to workspace
    const [workspaceOwner] = await db
        .select({
            id: workspaces.id,
            ownerId: workspaces.ownerId,

            // count current members
            memberCount: count(workspaceMembers.id)
        })
        .from(workspaces)
        .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))
        .limit(1)

    if (!workspaceOwner) throw new BadRequestError('Only workspace owners can add members')

    // step 2 check if user tier allows more members
    const [userTier] = await db
        .select({
            subscriptionTier: users.tierId
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

    if (!userTier) throw new BadRequestError('User tier not found')

    const tierDetails = await TierService.getTierById(userTier.subscriptionTier)
    if (!tierDetails) throw new BadRequestError('Tier details not found')

    if (tierDetails.membersPerWorkspaceLimit < workspaceOwner.memberCount) {
        throw new BadRequestError('Workspace member limit exceeded')
    }

    await db.insert(workspaceMembers).values({
        workspaceId,
        userId: userToAddId,
        permission
    })

    return ApiResponse(req, res, 201, 'Member added to workspace successfully', null)
})

// Updates a member's permission level in the workspace.
export const updateMemberPermission = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    // - Validates user is owner or has full_access permission
    // - Cannot modify owner's permission
    // - Updates permission field in workspace_members
    // - Updates updated_at timestamp
    // - Returns updated member object
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId } = req.params as { workspaceId: string }
    if (!workspaceId) throw new BadRequestError('Workspace ID is required')

    const { memberId, newPermission } = req.body as { memberId: string; newPermission: Permission }
    if (!memberId || !newPermission) throw new BadRequestError('Member ID and new permission are required')

    const [workspace] = await db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))

    if (!workspace) throw new BadRequestError('Only workspace owners can update member permissions')

    const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberId)))

    if (!member) throw new BadRequestError('Member not found in this workspace')

    await db
        .update(workspaceMembers)
        .set({
            permission: newPermission,
            updatedAt: new Date()
        })
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberId)))

    return ApiResponse(req, res, 200, 'Member permission updated successfully', {
        member: {
            id: member.id,
            userId: member.userId,
            workspaceId: member.workspaceId,
            permission: newPermission,
            updatedAt: new Date()
        }
    })
})

// Removes a member from the workspace.
export const removeWorkspaceMember = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    // - Validates user is owner or has full_access permission
    // - Cannot remove workspace owner
    // - Deletes workspace_members record
    // - Logs activity
    // - Returns success confirmation
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId } = req.params as { workspaceId: string }
    if (!workspaceId) throw new BadRequestError('Workspace ID is required')

    const { memberId } = req.body as { memberId: string }
    if (!memberId) throw new BadRequestError('Member ID is required')

    const [workspace] = await db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))
        .limit(1)

    // only owner can remove members
    if (!workspace) throw new BadRequestError('Only workspace owners can remove members')

    // cannot remove owner
    if (workspace.ownerId === memberId) throw new BadRequestError('Cannot remove the workspace owner')

    await db.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberId)))

    return ApiResponse(req, res, 200, 'Member removed from workspace successfully', null)
})

// Allows a member to leave a workspace they don't own.
export const leaveWorkspace = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId } = req.params as { workspaceId: string }
    if (!workspaceId) throw new BadRequestError('Workspace ID is required')

    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
    if (!workspace) throw new BadRequestError('Workspace not found')

    if (workspace.ownerId === userId) throw new BadRequestError('Workspace owners cannot leave their own workspace')

    await db.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))

    return ApiResponse(req, res, 200, 'Left workspace successfully', null)
})
