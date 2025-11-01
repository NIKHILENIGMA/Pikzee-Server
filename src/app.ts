import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import { clerkMiddleware } from '@clerk/express'
import 'source-map-support/register'

import { CORS_METHODS, CORS_ORIGIN, IS_PRODUCTION } from '@/config'
import { authWebhookRouter } from './modules/auth'
import router from '@/core'
import { errorHandler, notFound } from '@/middlewares'

const createApp = (): Application => {
    const app = express()

    // Middleware
    app.use(
        cors({
            origin: CORS_ORIGIN, // Allow all origins by default
            methods: CORS_METHODS,
            credentials: true
        })
    )
    app.use(helmet()) // Security headers
    app.use(compression()) // Compress responses
    app.use(cookieParser()) // Parse cookies
    app.use('/api/v1', authWebhookRouter) // Auth webhooks
    app.use(clerkMiddleware()) // Clerk authentication
    app.use(express.json({ limit: '10mb' })) // Limit JSON body size to 10mb
    app.use(express.urlencoded({ extended: true, limit: '5mb' })) // Limit URL-encoded body size to 5mb
    app.use(express.static('public')) // Serve static files from 'public' directory

    if (IS_PRODUCTION) {
        app.use(morgan('combined')) // Use 'combined' format in production
    } else {
        app.use(morgan('dev')) // Use 'dev' format in development
    }

    // Routes
    app.use('/api/v1', router)
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            request: {
                method: req.method,
                url: req.originalUrl,
                headers: req.headers
            }
        })
    })
    // Not Found Middleware
    app.use(notFound)
    app.use(errorHandler)

    return app
}

export default createApp
