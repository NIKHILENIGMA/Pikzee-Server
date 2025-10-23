import z from 'zod'
import { createWorkspaceSchema, updateWorkspaceSchema } from '@/shared'

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>

export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceSchema>
