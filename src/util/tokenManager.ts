import jwt, { SignOptions } from 'jsonwebtoken'
import { ACCESS_TOKEN_EXPIRY, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_EXPIRY, REFRESH_TOKEN_SECRET } from '../config/application.config'
import { TokenPayload } from '../types'
import { InternalServerError } from './StandardError'

interface RefreshTokenPayload { id: string, iat: number, exp: number }

class TokenManager {
    private static instance: TokenManager
    private accessSecret: string
    private refreshSecret: string
    constructor() {
        this.accessSecret = ACCESS_TOKEN_SECRET
        this.refreshSecret = REFRESH_TOKEN_SECRET
    }
    public static getInstance(): TokenManager {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager()
        }
        return TokenManager.instance
    }
    
    public createAccessToken(payload: TokenPayload): string {
        const jwtOptions: SignOptions = {
            expiresIn: ACCESS_TOKEN_EXPIRY // Token expiration time
        }

        const accessToken = jwt.sign(payload, this.accessSecret, jwtOptions)

        if (!accessToken) {
            throw new InternalServerError('Failed to generate access token')
        }

        return accessToken
    }

    public verifyAccessToken(token: string): TokenPayload {
        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload
            return decoded
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new InternalServerError(`Invalid or expired access token: ${error.message}`, 'TokenManager.verifyAccessToken')
            }
            throw new InternalServerError(`Failed to verify access token: ${(error as Error)?.message}`, 'TokenManager.verifyAccessToken')
        }
    }

    public createRefreshToken(payload: string): string {
        const jwtRefreshOptions: SignOptions = {
            expiresIn: REFRESH_TOKEN_EXPIRY // Refresh token expiration time
        }

        const refreshToken = jwt.sign({ id: payload }, this.refreshSecret, jwtRefreshOptions)

        if (!refreshToken) {
            throw new InternalServerError('Failed to generate refresh token')
        }

        return refreshToken
    }

    public verifyRefreshToken(token: string): RefreshTokenPayload | null {
        try {
            const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload 
            console.log('dDecoded refresh token:', decoded);
            
            return decoded
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new InternalServerError(`Invalid or expired refresh token: ${error.message}`, 'TokenManager.verifyRefreshToken')
            }
        }
        return null
    }
}

export const tokenManager = TokenManager.getInstance()

// export function generateToken(payload: TokenPayload): TokenPair {
//     try {
//         const jwtOptions: SignOptions = {
//             expiresIn: ACCESS_TOKEN_EXPIRY // Token expiration time
//         }

//         const jwtRefreshOptions: SignOptions = {
//             expiresIn: REFRESH_TOKEN_EXPIRY // Refresh token expiration time
//         }

//         const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, jwtOptions)

//         const refreshToken = jwt.sign({ id: payload.id }, REFRESH_TOKEN_SECRET, jwtRefreshOptions)

//         if (!accessToken || !refreshToken) {
//             throw new InternalServerError('Failed to generate tokens')
//         }

//         return {
//             accessToken,
//             refreshToken
//         }
//     } catch (error) {
//         if (error instanceof jwt.JsonWebTokenError) {
//             throw error
//         }

//         throw new InternalServerError(`Failed to generate tokens ${(error as Error)?.message}`, 'TokenManager.generateToken')
//     }
// }

// export function verifyToken(token: string): TokenPayload | null {
//     try {
//         const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload
//         return decoded
//     } catch (error) {
//         if (error instanceof jwt.JsonWebTokenError) {
//             return error.message === 'jwt expired' ? null : null
//         }
//     }
//     return null
// }

// export function verifyRefreshToken(token: string): string | null {
//     try {
//         const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as string
//         return decoded
//     } catch (error) {
//         if (error instanceof jwt.JsonWebTokenError) {
//             return null
//         }
//     }
//     return null
// }
