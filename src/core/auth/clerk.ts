import { getAuth } from '@clerk/express'
import { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '@/util'

export const clerkAuth = (req: Request, _: Response, next: NextFunction) => {
    try {
        const { userId } = getAuth(req)

        if (!userId) {
            // Return JSON error instead of redirecting
            throw new UnauthorizedError('User not authenticated')
        }

        next()
    } catch (error) {
        next(error)
    }
}
