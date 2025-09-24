import z from "zod"
import { ValidationError } from "./StandardError"

function baseValidation<T>(schema: z.ZodSchema, data: T) {
    const validationResult = schema.safeParse(data)

    if (!validationResult.success) {
        const formattedErrors = validationResult.error.issues.map((issue) => ({
            message: issue.message,
            field: issue.path.join('.'),
            code: issue.code
        }))

        throw new ValidationError(formattedErrors)
    }

    return validationResult.data as T
}

export function entitiesValidation<T>(schema: z.ZodSchema, body: T) {
    return baseValidation(schema, body)
}   

export function fileValidation<T>(schema: z.ZodSchema, file: T) {
    return baseValidation(schema, file)
}

export function paramsValidation<T>(schema: z.ZodSchema, params: T) {
    return baseValidation(schema, params)
}

export function queryValidation<T>(schema: z.ZodSchema, query: T) {
    return baseValidation(schema, query)
}