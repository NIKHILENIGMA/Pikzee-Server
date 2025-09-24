// Reponse Types

/**
 * Represents an HTTP response object
 * @typedef {Object} THttpResponse
 * @property {boolean} success - Indicates if the request was successful
 * @property {number} statusCode - HTTP status code of the response
 * @property {Object} request - Information about the HTTP request
 * @property {string|null} [request.ip] - IP address of the requester
 * @property {string} request.method - HTTP method used (GET, POST, etc)
 * @property {string} request.url - URL of the request
 * @property {string} message - Response message
 * @property {unknown} [data] - Optional response payload data
 */
export type THttpResponse = {
    success: boolean
    statusCode: number
    request: {
        ip?: string | null
        method: string
        url: string
    }
    message: string
    data?: unknown
}
