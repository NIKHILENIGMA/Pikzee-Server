import z from 'zod'

export const createWorkspaceSchema = z.object({
    name: z.string().min(3).max(50)
})

export const updateWorkspaceSchema = z.object({
    name: z.string().min(3).max(50).optional(),
    workspaceLogoImg: z.file().optional()
})

export const WorkspaceIdSchema = z.object({
    workspaceId: z.uuid().nonempty()
})
