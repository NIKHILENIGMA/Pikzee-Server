import { Request, Response, NextFunction } from 'express'
import { StandardError, InternalServerError } from '../util'

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

/**
 * A higher-order function that wraps an asynchronous request handler to handle errors gracefully.
 * This function ensures that any errors thrown during the execution of the wrapped handler
 * are caught and passed to the next middleware in the Express.js pipeline.
 *
 * @param fn - The asynchronous request handler function to be wrapped. It should be a function
 *             that takes `req`, `res`, and `next` as parameters and returns a Promise.
 *
 * @returns A new asynchronous function that wraps the provided handler and catches any errors
 *          that occur during its execution. If an error is thrown:
 *          - If the error is an instance of `StandardError`, it is passed directly to `next`.
 *          - If the error is an instance of `Error`, it is wrapped in an `InternalServerError`
 *            and passed to `next`.
 *          - If the error is not an instance of `Error`, an `InternalServerError` with a generic
 *            message is created and passed to `next`.
 */

export const AsyncHandler = (fn: AsyncRequestHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await fn(req, res, next)
        } catch (error) {
            // If it's already a StandardError, pass it through
            if (error instanceof StandardError) {
                next(error)
            } else if (error instanceof Error) {
                // Wrap other errors in InternalServerError
                next(new InternalServerError(error.message || 'Internal Server Error'))
            } else {
                // Handle non-Error objects
                next(new InternalServerError('Unknown error occurred'))
            }
        }
    }
}
