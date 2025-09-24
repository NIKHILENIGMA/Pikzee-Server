import { NextFunction, Request, Response } from 'express'
import { NotFoundError } from '../util'

/**
 * Middleware to handle 404 Not Found errors.
 *
 * This middleware is triggered when a request is made to a route
 * that does not exist in the application. It creates a custom
 * `AppError` instance with a 404 status code and a descriptive
 * error message indicating the requested route was not found.
 * The error is then passed to the `ApiError` handler for further
 * processing.
 *
 * @param req - The incoming HTTP request object.
 * @param _ - The outgoing HTTP response object (unused).
 * @param next - The next middleware function in the stack.
 */

export const notFound = (req: Request, _: Response, next: NextFunction): void => {
    next(new NotFoundError(`Route not found ${req.originalUrl} `))
}
