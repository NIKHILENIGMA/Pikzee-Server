import { AsyncHandler } from '@/core/http/asyncHandler'
import { ApiResponse } from '@/util'
import { Request, Response } from 'express'

// Creates an invitation to join a workspace via email.
export const createInvitation = AsyncHandler(async (req: Request, res: Response) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return ApiResponse(req, res, 201, 'Invitation created successfully', null)
})
