import dotenv from 'dotenv'

dotenv.config()

export const BUCKET_NAME: string = process.env.AWS_S3_BUCKET_NAME!
export const ACCESS_KEY_ID: string = process.env.AWS_ACCESS_KEY_ID!
export const SECRET_ACCESS_KEY: string = process.env.AWS_SECRET_ACCESS_KEY!
export const REGION: string = process.env.AWS_REGION!
export const URL_EXPIRATION_SECONDS: number = Number(process.env.URL_EXPIRATION_SECONDS)
