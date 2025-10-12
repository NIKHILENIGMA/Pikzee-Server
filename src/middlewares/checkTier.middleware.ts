import { getAuth } from '@clerk/express'
import { NextFunction, Request, Response } from 'express'

import { UnauthorizedError } from '@/util'
import { db } from '@/core/db'
import { tiers, users } from '@/core/db/schema'
import { eq } from 'drizzle-orm'

export const attachUserAndTier = async (req: Request, _: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req)
        // Check the user's tier and proceed accordingly
        if (!userId) {
            throw new UnauthorizedError('User not authenticated')
        }

        const [result] = await db
            .select({
                user: {
                    id: users.id,
                    email: users.email,
                    tierId: users.tierId,
                    createdAt: users.createdAt
                },
                tier: {
                    name: tiers.name,
                    storageLimitBytes: tiers.storageLimitBytes, // storage limit in bytes
                    fileUploadLimitBytes: tiers.fileUploadLimitBytes, // upload limit in bytes
                    membersPerWorkspaceLimit: tiers.membersPerWorkspaceLimit, // number of members allowed per workspace
                    projectsPerWorkspaceLimit: tiers.projectsPerWorkspaceLimit, // number of projects allowed per workspace
                    docsPerWorkspaceLimit: tiers.docsPerWorkspaceLimit, // number of docs allowed per workspace
                    draftsPerDocLimit: tiers.draftsPerDocLimit // number of drafts allowed per doc
                }
            })
            .from(users)
            .innerJoin(tiers, eq(users.tierId, tiers.id))
            .where(eq(users.id, userId))

        if (!result) throw new UnauthorizedError('User not found token may be invalid', 'token_invalid')

        req.user = result.user
        req.tier = result.tier

        next()
    } catch (error) {
        next(error)
    }
}
