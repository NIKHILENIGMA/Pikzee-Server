import * as AuthRoutes from './auth.routes'
import * as WebhookRoutes from './webhooks.routes'

export const authRouter = AuthRoutes.default
export const authWebhookRouter = WebhookRoutes.default
