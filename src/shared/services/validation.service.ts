import { BadRequestError } from '@/util'
import { ZodError, ZodType } from 'zod'

export class ValidationService {
    static validateBody<T>(body: unknown, schema: ZodType<T>): T {
        const result = schema.safeParse(body)
        if (!result.success) {
            const formattedErrors = this.formatZodErrors(result.error)
            const errorMessage = `Validation failed: ${formattedErrors.map((e) => `${e.field} - ${e.message}`).join(', ')}`
            throw new BadRequestError(errorMessage)
        }
        return result.data
    }

    static validateParams<T>(params: unknown, schema: ZodType<T>): T {
        const result = schema.safeParse(params)
        if (!result.success) {
            const formattedError = this.formatZodErrors(result.error)
            const errorMessage = `Parameter validation failed: ${formattedError.map((e) => `${e.field} - ${e.message}`).join(', ')}`
            throw new BadRequestError(errorMessage)
        }
        return result.data
    }

    static validateQuery<T>(query: unknown, schema: ZodType<T>): T {
        const result = schema.safeParse(query)
        if (!result.success) {
            const formattedError = this.formatZodErrors(result.error)
            const errorMessage = `Query validation failed: ${formattedError.map((e) => `${e.field} - ${e.message}`).join(', ')}`
            throw new BadRequestError(errorMessage)
        }
        return result.data
    }

    /**
     * Converts Zod validation errors into a standardized array of error objects.
     *
     * Each error object contains the field name (using dot notation for nested fields),
     * the error message, and the Zod error code.
     *
     * @param errors - The ZodError instance containing validation issues.
     * @returns An array of objects, each representing a validation error with `field`, `message`, and `code`.
     *
     * @example
     * ```typescript
     * import { ZodError } from 'zod';
     *
     * try {
     *   schema.parse(data);
     * } catch (err) {
     *   if (err instanceof ZodError) {
     *     const formatted = ValidationService.formatZodErrors(err);
     *      formatted = [
     *        { field: 'user.email', message: 'Invalid email', code: 'invalid_type' }
     *       { field: 'user.age', message: 'Expected number, received string', code: 'invalid_type' }
     *       { field: 'address.street', message: 'Required', code: 'invalid_type' }
     *       { field: 'address.zip', message: 'Invalid zip code', code: 'invalid_string' }
     *      ]
     *   }
     * }
     * ```
     */
    private static formatZodErrors(errors: ZodError): Array<{ field: string; message: string; code: string }> {
        return errors.issues.map((issue) => ({
            field: issue.path.join('.'), // Join path segments with dot notation
            message: issue.message, // Use the message from Zod issue
            code: issue.code // Use the code from Zod issue
        }))
    }
}
