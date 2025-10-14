import { permissionEnum } from '@/core/db/schema'
import z from 'zod'

export const addWorkspaceMemberSchema = z.object({
    newUserToAdd: z.string().min(1, 'User ID is required'),
    permission: z.enum(permissionEnum, {
        error: 'Permission level is required or invalid'
    })
})

export const updateMemberPermissionSchema = z.object({
    newPermission: z
        .enum(permissionEnum, {
            error: 'New permission level is required or invalid'
        })
        .optional()
})

export const WorkspaceMemberSchema = z.object({
    workspaceId: z.uuid('Invalid workspaceId').nonempty('workspaceId is required'),
    memberId: z.uuid('Invalid memberId').nonempty('memberId is required')
})
