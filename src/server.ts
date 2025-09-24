import createApp from './app'
import { APP_CONFIG } from './config'

const server = () => {
    const app = createApp()

    app.listen(APP_CONFIG.PORT, () => {
        console.log(`Server is running on port ${APP_CONFIG.PORT}`)
    })
}

server()
