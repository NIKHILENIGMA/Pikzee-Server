import z from 'zod'

// Reusable primitives
const uuidSchema = (message = 'Invalid UUID format') => z.uuid({ message })
const nameSchema = z.string().trim().min(4, 'Project name is required')
export const projectStatusEnum = z.enum(['active', 'inactive'])

// Base/project shapes
const baseProjectBody = z.object({
    name: nameSchema
})

// Create Project
export const createProjectSchema = baseProjectBody
    .extend({
        workspaceId: uuidSchema('Invalid workspace ID format')
    })
    .strict()

// Update Project
export const updateProjectSchema = baseProjectBody
    .extend({
        status: projectStatusEnum.optional(),
        workspaceId: uuidSchema('Invalid workspace ID format')
    })
    .strict()

export const projectBodySchema = z
    .object({
        workspaceId: uuidSchema('Invalid workspace ID format')
    })
    .strict()

export const projectAccessSchema = z.object({
    userId: z.string().min(1, { message: 'User ID cannot be empty.' })
})

export const projectIdSchema = z.object({
    projectId: uuidSchema('Invalid project ID format')
})

export const projectQuerySchemaType = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
})
