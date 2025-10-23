import z from 'zod'

export const createProjectSchema = z.object({
    name: z.string().min(1, 'Project name is required')
})

export const projectIdSchema = z.object({
    projectId: z.uuid({ message: 'Invalid project ID format' })
})
