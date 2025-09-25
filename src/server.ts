import 'tsconfig-paths/register'
import createApp from './app'
import { APP_CONFIG } from './config'
import { logger } from './config/logger'

const server = () => {
    const app = createApp()

    // Start server
    app.listen(APP_CONFIG.PORT, () => {
        logger.info(`Server running on port ${APP_CONFIG.PORT} in ${APP_CONFIG.NODE_ENV} mode`)
    })
}

server()
