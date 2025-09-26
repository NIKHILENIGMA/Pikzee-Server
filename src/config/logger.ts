import pino from 'pino'
import { NODE_ENV } from './application.config'

export const logger = pino({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
})
