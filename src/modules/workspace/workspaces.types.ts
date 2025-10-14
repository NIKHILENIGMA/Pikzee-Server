import z from 'zod'
import { createWorkspaceSchema, updateWorkspaceSchema } from './workspace.validator'

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceSchema>

export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceSchema>
