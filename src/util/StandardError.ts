/**
 * Base class for all standard HTTP errors
 * Extends the built-in Error class with additional HTTP status code and serialization capabilities
 */
export abstract class StandardError extends Error {
    constructor(public message: string) {
        super(message)
        Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    }
    public abstract StatusCode: number
    public abstract serialize(): { message: string; field?: string }[]
}

/**
 * Represents a 400 Bad Request error
 * Used when the request cannot be processed due to client error
 */
export class BadRequestError extends StandardError {
    public StatusCode = 400
    constructor(
        public message: string,
        public field?: string
    ) {
        super(message)
    }
    public serialize() {
        return [{ message: this.message, field: this.field }]
    }
}

/**
 * Represents a 401 Unauthorized error
 * Used when authentication is required but has failed or not been provided
 */
export class UnauthorizedError extends StandardError {
    public StatusCode = 401
    constructor(
        public message: string,
        public field?: string
    ) {
        super(message)
    }
    public serialize() {
        return [{ message: this.message, field: this.field }]
    }
}

/**
 * Represents a 403 Forbidden error
 * Used when the server understands the request but refuses to authorize it
 */
export class ForbiddenError extends StandardError {
    public StatusCode = 403
    constructor(
        public message: string,
        public field?: string
    ) {
        super(message)
    }
    public serialize() {
        return [{ message: this.message, field: this.field }]
    }
}

/**
 * Represents a 404 Not Found error
 * Used when the requested resource could not be found
 */
export class NotFoundError extends StandardError {
    public StatusCode = 404
    constructor(
        public message: string,
        public field?: string
    ) {
        super(message)
    }
    public serialize() {
        return [{ message: this.message, field: this.field }]
    }
}

/**
 * Represents a 409 Conflict error
 * Used when the request conflicts with the current state of the server
 */
export class ConflictError extends StandardError {
    public StatusCode = 409
    constructor(
        public message: string,
        public field?: string
    ) {
        super(message)
    }
    public serialize() {
        return [{ message: this.message, field: this.field }]
    }
}

/**
 * Represents a 422 Unprocessable Entity error
 * Used when the request was well-formed but contains semantic errors
 */
export class ValidationError extends StandardError {
    public StatusCode = 422
    constructor(private errors: { message: string; field?: string }[]) {
        super('Validation Error')
    }
    public serialize() {
        return this.errors
    }
}

/**
 * Represents a 429 Too Many Requests error
 * Used when the user has sent too many requests in a given amount of time
 */
export class TooManyRequestsError extends StandardError {
    public StatusCode = 429
    constructor(
        public message: string,
        public field?: string
    ) {
        super(message)
    }
    public serialize() {
        return [{ message: this.message, field: this.field }]
    }
}

/**
 * Represents a 500 Internal Server Error
 * Used when the server encounters an unexpected condition
 */
export class InternalServerError extends StandardError {
    public StatusCode = 500
    constructor(
        public message: string,
        public field?: string
    ) {
        super(message)
    }
    public serialize() {
        return [{ message: this.message, field: this.field }]
    }
}

export class DatabaseError extends StandardError {
    public StatusCode = 500
    constructor(
        public message: string,
        public field?: string
    ) {
        super(message)
    }
    public serialize() {
        return [{ message: this.message, field: this.field }]
    }
}
