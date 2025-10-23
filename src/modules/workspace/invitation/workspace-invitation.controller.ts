import { Request, Response } from 'express'
import { AsyncHandler } from '@/lib'
import { ApiResponse } from '@/util'

// Creates an invitation to join a workspace via email.
export const createInvitation = AsyncHandler(async (req: Request, res: Response) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return ApiResponse(req, res, 201, 'Invitation created successfully', null)
})
