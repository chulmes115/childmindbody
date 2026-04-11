import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const BUCKET = process.env.AWS_S3_BUCKET!

export async function listImages(prefix: string): Promise<string[]> {
  const result = await s3.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
  )
  const region = process.env.AWS_REGION ?? 'us-east-2'
  return (result.Contents ?? [])
    .filter((obj) => obj.Key && !obj.Key.endsWith('/'))
    .map((obj) => `https://${BUCKET}.s3.${region}.amazonaws.com/${obj.Key}`)
}
