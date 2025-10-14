/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { clerkClient } from '@clerk/express'

import { logger } from '@/config/logger'
import { db } from '../drizzle'

import { users } from '../schema'

interface UserData {
    firstName: string
    lastName: string
    email: string
    password: string
}

const USERS: UserData[] = [
    {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        password: '$ecur1ty!PwD7P@ss#wOrd'
    },
    {
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob.smith@example.com',
        password: '$ecur1ty!PwD7P@ss#wOrd'
    },
    {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie.brown@example.com',
        password: '$ecur1ty!PwD7P@ss#wOrd'
    },
    {
        firstName: 'Diana',
        lastName: 'Evans',
        email: 'diana.evans@example.com',
        password: '$ecur1ty!PwD7P@ss#wOrd'
    },
    {
        firstName: 'Ethan',
        lastName: 'Williams',
        email: 'ethan.williams@example.com',
        password: '$ecur1ty!PwD7P@ss#wOrd'
    }
]

export const seedUsers = async () => {
    try {
        logger.info('🌱 Creating users in Clerk...')

        const clerkUsers = await Promise.all(
            USERS.map((user) =>
                clerkClient.users
                    .createUser({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        emailAddress: [user.email],
                        password: user.password,
                        skipPasswordRequirement: false,
                        skipPasswordChecks: false
                    })
                    .catch((error) => {
                        // Handle duplicate user gracefully
                        if (error.errors?.[0]?.code === 'form_identifier_exists') {
                            logger.warn(`⚠️ User ${user.email} already exists in Clerk, skipping...`)
                            return null
                        }
                        throw error
                    })
            )
        )

        // Filter out null values (skipped users)
        const validClerkUsers = clerkUsers.filter((user) => user !== null)
        logger.info(`✅ Created ${validClerkUsers.length} users in Clerk`)

        logger.info('🌱 Seeding users to PostgreSQL database...')

        // Use transaction for atomicity
        await db.transaction(async (tx) => {
            for (const user of validClerkUsers) {
                await tx
                    .insert(users)
                    .values({
                        id: user.id,
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        email: user.emailAddresses[0]?.emailAddress || '',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })
                    .onConflictDoNothing() // Skip if user already exists
            }
        })

        logger.info('✅ Successfully seeded users in PostgreSQL database')
    } catch (error) {
        logger.error(`❌ Error seeding users: ${(error as Error).message}`)
        throw error
    }
}
