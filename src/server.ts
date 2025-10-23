import 'tsconfig-paths/register'
import createApp from './app'
import { logger, NODE_ENV, PORT } from '@/config'

const server = () => {
    const app = createApp()

    // Start server
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`)
    })
}

server()
