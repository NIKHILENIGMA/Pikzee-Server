import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { APP_CONFIG } from './config'
import morgan from 'morgan'
import { errorHandler, notFound } from './middlewares'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import { router as routes } from './core/http/router'
import { clerkMiddleware } from '@clerk/express'

const createApp = (): Application => {
    const app = express()

    // Middleware
    app.use(
        cors({
            origin: APP_CONFIG.CORS_ORIGIN, // Allow all origins by default
            methods: APP_CONFIG.CORS_METHODS,
            credentials: true
        })
    )
    app.use(helmet()) // Security headers
    app.use(compression()) // Security headers
    app.use(cookieParser()) // Parse cookies
    app.use(clerkMiddleware()) // Clerk authentication
    app.use(express.json({ limit: '10mb' })) // Limit JSON body size to 10mb
    app.use(express.urlencoded({ extended: true, limit: '5mb' })) // Limit URL-encoded body size to 5mb
    app.use(express.static('public')) // Serve static files from 'public' directory

    if (APP_CONFIG.IS_PRODUCTION) {
        app.use(morgan('combined')) // Use 'combined' format in production
    } else {
        app.use(morgan('dev')) // Use 'dev' format in development
    }

    // Routes
    app.use('/api/v1', routes)
    // Not Found Middleware
    app.use(notFound)
    app.use(errorHandler)

    return app
}

export default createApp
