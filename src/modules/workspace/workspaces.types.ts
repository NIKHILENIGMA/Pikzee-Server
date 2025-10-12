import z from 'zod'
import { createWorkspaceSchema, updateWorkspaceSchema } from './workspace.schema'

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>

export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceSchema>
