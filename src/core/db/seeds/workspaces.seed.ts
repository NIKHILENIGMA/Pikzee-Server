import { logger } from '@/config/logger'
import { db } from '../drizzle'

import { users, workspaceMembers, workspaces } from '../schema'

export const seedWorkspaces = async () => {
    logger.info('🌱 Seeding workspaces...')

    try {
        const existingUsers = await db.select().from(users)

        if (!existingUsers || existingUsers.length === 0) throw new Error('No users found. Please seed users first.')

        // Create workspaces for each user
        for (const user of existingUsers) {
            await db.transaction(async (tx) => {
                const [workspace] = await tx
                    .insert(workspaces)
                    .values({
                        name: `${user.firstName}'s Workspace`,
                        slug: `${user.firstName}-${new Date().getTime()}`,
                        ownerId: user.id,
                        workspaceLogoUrl: '',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })
                    .returning({
                        id: workspaces.id,
                        name: workspaces.name,
                        slug: workspaces.slug,
                        ownerId: workspaces.ownerId
                    })

                await tx.insert(workspaceMembers).values({
                    workspaceId: workspace.id,
                    userId: user.id,
                    permission: 'FULL_ACCESS'
                })
            })
        }

        logger.info('✅ Successfully seeded workspaces in PostgreSQL database')
    } catch (error) {
        logger.error(`❌ Error seeding workspaces: ${(error as Error).message}`)
        throw error
    }
}
