import type { WebhookEvent } from '@clerk/express'
import { Request, Response } from 'express'
import { Webhook } from 'svix'

import { db, users } from '@/core'
import { logger, CLERK_WEBHOOK_SECRET } from '@/config'
import { ApiResponse, InternalServerError, NotFoundError, StandardError } from '@/util'

export const onboardingUser = async (req: Request, res: Response) => {
    const svixId = req.headers['svix-id'] as string
    const svixTimestamp = req.headers['svix-timestamp'] as string
    const svixSignature = req.headers['svix-signature'] as string

    if (!svixId || !svixTimestamp || !svixSignature) {
        throw new NotFoundError('Invalid request svix headers', 'SVIX_HEADERS_MISSING')
    }

    const wh = new Webhook(CLERK_WEBHOOK_SECRET)

    try {
        // IMPORTANT: req.body is a Buffer here, not JSON
        const evt = wh.verify(req.body as Buffer, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature
        }) as WebhookEvent

        if (evt.type === 'user.created') {
            const { id, email_addresses, primary_email_address_id, image_url, first_name, last_name } = evt.data
            const primaryEmail = email_addresses.find((e: { id: string }) => e.id === primary_email_address_id)?.email_address

            if (!primaryEmail) {
                throw new NotFoundError('Primary email not found', 'PRIMARY_EMAIL_NOT_FOUND')
            }

            const userDetails = {
                id,
                firstName: first_name,
                lastName: last_name,
                email: primaryEmail,
                avatarImage: image_url,
                tierId: 1 // Default to Free tier
            }

            // For debugging purposes
            // logger.info(`New Clerk user: ${JSON.stringify(userDetails)}`)

            const createdUser = await db.insert(users).values(userDetails).returning()

            logger.info(`✅ New user onboarded: ${JSON.stringify(createdUser[0])}`)

            return ApiResponse(req, res, 200, 'User onboarded successfully', createdUser[0])
        }
    } catch (err) {
        logger.error(`❌ Webhook verification failed: ${(err as Error)?.message}`)
        if (err instanceof StandardError) {
            throw err
        }
        throw new InternalServerError(`Webhook verification failed, reason might be: ${(err as Error)?.message}`, 'WEBHOOK_VERIFICATION_FAILED')
    }
}
