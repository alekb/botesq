import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config.js'
import { ApiError } from '../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

let s3Client: S3Client | null = null

/**
 * Get or create S3 client
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.aws?.region ?? 'us-east-1',
      credentials: config.aws?.accessKeyId
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey!,
          }
        : undefined,
    })
  }
  return s3Client
}

/**
 * Check if S3 is configured
 */
export function isStorageConfigured(): boolean {
  return !!config.aws?.s3Bucket
}

/**
 * Get the S3 bucket name
 */
function getBucket(): string {
  if (!config.aws?.s3Bucket) {
    throw new ApiError('STORAGE_NOT_CONFIGURED', 'S3 storage not configured', 503)
  }
  return config.aws.s3Bucket
}

/**
 * Generate S3 key for a document
 */
export function generateS3Key(operatorId: string, documentId: string, filename: string): string {
  const extension = filename.split('.').pop() ?? ''
  return `documents/${operatorId}/${documentId}.${extension}`
}

/**
 * Upload a file to S3
 */
export async function uploadFile(params: {
  key: string
  body: Buffer | Uint8Array | string
  contentType: string
  metadata?: Record<string, string>
}): Promise<{ bucket: string; key: string; etag?: string }> {
  const { key, body, contentType, metadata } = params
  const bucket = getBucket()
  const client = getS3Client()

  logger.debug({ bucket, key, contentType }, 'Uploading file to S3')

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  })

  const response = await client.send(command)

  logger.info({ bucket, key, etag: response.ETag }, 'File uploaded to S3')

  return {
    bucket,
    key,
    etag: response.ETag,
  }
}

/**
 * Get a presigned URL for downloading a file
 */
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const bucket = getBucket()
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const url = await getSignedUrl(client, command, { expiresIn })

  logger.debug({ bucket, key, expiresIn }, 'Generated presigned download URL')

  return url
}

/**
 * Get a presigned URL for uploading a file
 */
export async function getUploadUrl(params: {
  key: string
  contentType: string
  expiresIn?: number
}): Promise<string> {
  const { key, contentType, expiresIn = 3600 } = params
  const bucket = getBucket()
  const client = getS3Client()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(client, command, { expiresIn })

  logger.debug({ bucket, key, contentType, expiresIn }, 'Generated presigned upload URL')

  return url
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string): Promise<{
  contentType?: string
  contentLength?: number
  lastModified?: Date
  metadata?: Record<string, string>
} | null> {
  const bucket = getBucket()
  const client = getS3Client()

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const response = await client.send(command)

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    }
  } catch (error) {
    if ((error as { name?: string }).name === 'NotFound') {
      return null
    }
    throw error
  }
}

/**
 * Download file content from S3
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const bucket = getBucket()
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await client.send(command)

  if (!response.Body) {
    throw new ApiError('STORAGE_ERROR', 'File not found', 404)
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const bucket = getBucket()
  const client = getS3Client()

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await client.send(command)

  logger.info({ bucket, key }, 'File deleted from S3')
}

/**
 * Allowed file types for document upload
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
]

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Validate file for upload
 */
export function validateFile(params: {
  filename: string
  mimeType: string
  size: number
}): { valid: boolean; reason?: string } {
  const { filename, mimeType, size } = params

  if (!filename || filename.trim().length === 0) {
    return { valid: false, reason: 'Filename is required' }
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      reason: `File type not allowed. Allowed types: PDF, Word, TXT, PNG, JPEG`,
    }
  }

  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      reason: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}
