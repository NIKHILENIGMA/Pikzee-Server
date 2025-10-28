import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { ACCESS_KEY_ID, BUCKET_NAME, REGION, SECRET_ACCESS_KEY, URL_EXPIRATION_SECONDS } from '@/config'

export const s3Client = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY
    }
})

export async function generatePresignedUrl(s3Key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        ContentType: contentType
    })

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRATION_SECONDS })
    return presignedUrl
}

export async function uploadMultipartFile(s3Key: string, fileBuffer: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType
    })

    await s3Client.send(command)
}
