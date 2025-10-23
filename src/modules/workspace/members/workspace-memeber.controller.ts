import { getAuth } from '@clerk/express'
import { Request, Response } from 'express'
import { and, count, eq } from 'drizzle-orm'

import { db, workspaceMembers, workspaces, users } from '@/core'
import { logger } from '@/config'
import { AsyncHandler } from '@/lib'
import { ValidationService, WorkspaceIdSchema, addWorkspaceMemberSchema, updateMemberPermissionSchema, WorkspaceMemberSchema } from '@/shared'
import { ApiResponse, BadRequestError, UnauthorizedError } from '@/util'

// Retrieves all members of a workspace with their permissions.
export const getWorkspaceMembers = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId } = ValidationService.validateParams(req.params, WorkspaceIdSchema)

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
            // workspace member details
            memberId: workspaceMembers.id,
            permissions: workspaceMembers.permission,
            joinedAt: workspaceMembers.joinedAt,
            updatedAt: workspaceMembers.updatedAt,

            // user details
            userId: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarImage: users.avatarImage,

            // workspace owner id for isOwner check
            workspaceOwnerId: workspaces.ownerId
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, workspaceId))
        .orderBy(workspaceMembers.joinedAt)

    if (!members) throw new BadRequestError('No members found for this workspace')

    const membersWithPermissions = members.map((member) => ({
        id: member.memberId,
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
export const addMemberToWorkspace = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId } = ValidationService.validateParams(req.params, WorkspaceIdSchema)
    const { newUserToAdd, permission } = ValidationService.validateBody(req.body, addWorkspaceMemberSchema)

    // Extract the tier info from the request
    if (!req.tier) throw new BadRequestError('Workspace member limit not found')
    const { membersPerWorkspaceLimit } = req.tier

    // step 1 validate user has access as owner to workspace
    const [ws] = await db
        .select({
            id: workspaces.id,
            ownerId: workspaces.ownerId
        })
        .from(workspaces)
        .where(and(eq(workspaces.id, workspaceId)))
        .limit(1)

    if (!ws) throw new BadRequestError('Workspace not found')
    if (ws.ownerId !== userId) throw new BadRequestError('Only workspace owners can add members')

    // step 2 validate new user exists on platform
    const [newUser] = await db.select().from(users).where(eq(users.id, newUserToAdd)).limit(1)
    if (!newUser) throw new BadRequestError('User does not exist on platform')
    if (newUser.id === userId) throw new BadRequestError('Workspace owners cannot add themselves as members')

    // step 3 check current member count against tier limit
    const [countRow] = await db
        .select({
            count: count(workspaceMembers.id)
        })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId))
        .limit(1)
    const currentMemberCount = countRow ? Number(countRow.count) : 0
    if (currentMemberCount >= membersPerWorkspaceLimit) {
        throw new BadRequestError('Workspace member limit exceeded')
    }

    // check user is not already a member
    const [existingMember] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, newUserToAdd)))
        .limit(1)

    if (existingMember) throw new BadRequestError('User is already a member of this workspace')

    // insert new member
    await db.insert(workspaceMembers).values({
        workspaceId,
        userId: newUserToAdd,
        permission
    })

    return ApiResponse(req, res, 201, 'Member added to workspace successfully', null)
})

// Updates a member's permission level in the workspace.
export const updateMemberPermission = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    // Validate and extract workspaceId from params
    const { workspaceId, memberId } = ValidationService.validateParams(req.params, WorkspaceMemberSchema)
    // Validate and extract memberId and newPermission from body
    const { newPermission } = ValidationService.validateBody(req.body, updateMemberPermissionSchema)

    // Ensure workspaceId and memberId are provided
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)

    if (!workspace) throw new BadRequestError('Workspace not found')
    logger.info(`userID: ${userId}, owned by ${workspace.ownerId}`)

    if (workspace.ownerId !== userId) throw new BadRequestError('Only workspace owners can update member permissions')

    const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.id, memberId)))
        .limit(1)

    if (!member) throw new BadRequestError('Member not found in this workspace')

    // Update the member's permission and updatedAt timestamp
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
export const removeMemberFromWorkspace = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId, memberId } = ValidationService.validateParams(req.params, WorkspaceMemberSchema)

    const [workspace] = await db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))
        .limit(1)

    // only owner can remove members
    if (!workspace) throw new BadRequestError('Only workspace owners can remove members')

    // cannot remove owner
    if (workspace.ownerId === memberId) throw new BadRequestError('Cannot remove the workspace owner')

    const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.id, memberId)))
        .limit(1)

    if (!member) throw new BadRequestError('Member not found in this workspace')

    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, member.id))

    return ApiResponse(req, res, 200, 'Member removed from workspace successfully', null)
})

// Allows a member to leave a workspace they don't own.
export const existMemberFromWorkspace = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req)
    if (!userId) throw new UnauthorizedError('User not authenticated')

    const { workspaceId } = ValidationService.validateParams(req.params, WorkspaceIdSchema)

    // check workspace exists
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
    if (!workspace) throw new BadRequestError('Workspace not found')

    logger.info(`userID: ${userId}, owned by ${workspace.ownerId}`)
    // cannot leave if owner
    if (workspace.ownerId === userId) throw new BadRequestError('Workspace owners cannot leave their own workspace')

    // check user is a member
    const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
        .limit(1)
    if (!member) throw new BadRequestError('User is not a member of this workspace')

    await db.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))

    return ApiResponse(req, res, 200, 'Left workspace successfully', null)
})
