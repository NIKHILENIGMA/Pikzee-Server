import z from 'zod'
import { InferSelectModel, InferInsertModel } from 'drizzle-orm'

import { projectAccess, projects } from '@/core'
import { createProjectSchema, projectIdSchema, updateProjectSchema } from '@/shared'

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

export type ProjectIdParam = z.infer<typeof projectIdSchema>

export type Project = InferSelectModel<typeof projects>
export type NewProject = InferInsertModel<typeof projects>

export type ProjectAccess = InferSelectModel<typeof projectAccess>
export type NewProjectAccess = InferInsertModel<typeof projectAccess>
