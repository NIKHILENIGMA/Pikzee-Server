import { Request, Response } from 'express'
import { THttpResponse } from '../types/api/response.types'
import { APP_CONFIG } from '../config'

/**
 * Sends a standardized API response.
 *
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @param responseStatusCode - The status code to send in the response.
 * @param responseMessage - The message to send in the response.
 * @param data - Optional data to include in the response. Defaults to null.
 *
 * @returns void
 */

export const ApiResponse = (req: Request, res: Response, responseStatusCode: number, responseMessage: string, data: unknown = null): void => {
    const response: THttpResponse = {
        success: true,
        statusCode: responseStatusCode,
        request: {
            ip: req.ip || null,
            method: req.method,
            url: req.url
        },
        message: responseMessage,
        data: data
    }

    if (APP_CONFIG.IS_PRODUCTION) {
        delete response.request.ip
    }

    res.status(responseStatusCode).json(response)
}
