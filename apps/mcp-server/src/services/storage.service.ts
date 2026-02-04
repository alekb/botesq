import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { fileTypeFromBuffer } from 'file-type'
import { config } from '../config.js'
import { ApiError } from '../types.js'
import { scanBuffer, isVirusScanEnabled, type ScanResult } from './virus-scan.service.js'
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
    ServerSideEncryption: 'AES256',
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
 * Upload a file to S3 with virus scanning
 * This is the recommended method for uploading user-provided content
 */
export async function uploadFileSecure(params: {
  key: string
  body: Buffer
  contentType: string
  filename?: string
  metadata?: Record<string, string>
}): Promise<{ bucket: string; key: string; etag?: string; scanResult?: ScanResult }> {
  const { key, body, contentType, filename, metadata } = params

  // Scan for viruses before upload
  const scanResult = await scanBuffer(body, filename)

  if (scanResult.isInfected) {
    logger.warn({ key, filename, viruses: scanResult.viruses }, 'Rejected infected file upload')
    throw new ApiError(
      'FILE_INFECTED',
      `File rejected: malware detected (${scanResult.viruses.join(', ')})`,
      400
    )
  }

  // Upload clean file
  const result = await uploadFile({ key, body, contentType, metadata })

  logger.info(
    {
      key,
      filename,
      scanDurationMs: scanResult.scanDurationMs,
      virusScanEnabled: isVirusScanEnabled(),
    },
    'Secure file upload completed'
  )

  return {
    ...result,
    scanResult,
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
}): Promise<{ url: string; requiredHeaders: Record<string, string> }> {
  const { key, contentType, expiresIn = 3600 } = params
  const bucket = getBucket()
  const client = getS3Client()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  })

  const url = await getSignedUrl(client, command, { expiresIn })

  logger.debug({ bucket, key, contentType, expiresIn }, 'Generated presigned upload URL')

  return {
    url,
    requiredHeaders: {
      'Content-Type': contentType,
      'x-amz-server-side-encryption': 'AES256',
    },
  }
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
 * Allowed MIME types for document upload
 */
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
])

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Sanitize filename to prevent path traversal and other attacks
 * Removes directory components, null bytes, and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove null bytes
  let sanitized = filename.replace(/\0/g, '')

  // Get just the filename, removing any path components
  sanitized = sanitized.split(/[\\/]/).pop() ?? ''

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '')

  // Replace dangerous characters with underscore
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_')

  // Collapse multiple underscores/spaces
  sanitized = sanitized.replace(/[_\s]+/g, '_')

  // Ensure filename is not empty after sanitization
  if (!sanitized || sanitized.length === 0) {
    return 'unnamed_file'
  }

  // Limit filename length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() ?? ''
    const name = sanitized.slice(0, 255 - ext.length - 1)
    sanitized = ext ? `${name}.${ext}` : name
  }

  return sanitized
}

/**
 * Validate file for upload (basic checks without content inspection)
 */
export function validateFile(params: { filename: string; mimeType: string; size: number }): {
  valid: boolean
  reason?: string
} {
  const { filename, mimeType, size } = params

  if (!filename || filename.trim().length === 0) {
    return { valid: false, reason: 'Filename is required' }
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
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

/**
 * Validate file content using magic bytes detection
 * This detects actual file type from content, not just the claimed MIME type
 */
export async function validateFileContent(buffer: Buffer): Promise<{
  valid: boolean
  detectedMime?: string
  reason?: string
}> {
  // Check size first
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      reason: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  // Detect actual file type from magic bytes
  const detected = await fileTypeFromBuffer(buffer)

  // text/plain files have no magic bytes, so fileTypeFromBuffer returns undefined
  // We allow these through if the buffer appears to be valid text
  if (!detected) {
    // Check if content appears to be valid UTF-8 text
    if (isValidTextContent(buffer)) {
      return { valid: true, detectedMime: 'text/plain' }
    }
    return {
      valid: false,
      reason: 'Could not determine file type. Ensure file is a valid PDF, Word, TXT, PNG, or JPEG.',
    }
  }

  // Check if detected type is in allowed list
  if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
    return {
      valid: false,
      detectedMime: detected.mime,
      reason: `File content type (${detected.mime}) not allowed. Allowed types: PDF, Word, TXT, PNG, JPEG`,
    }
  }

  return { valid: true, detectedMime: detected.mime }
}

/**
 * Check if buffer contains valid UTF-8 text content
 */
function isValidTextContent(buffer: Buffer): boolean {
  try {
    // Check for common binary indicators
    // Null bytes in first 8KB typically indicate binary
    const sample = buffer.slice(0, 8192)
    if (sample.includes(0)) {
      return false
    }

    // Try to decode as UTF-8
    const text = sample.toString('utf8')

    // Check for replacement characters (indicates invalid UTF-8)
    if (text.includes('\uFFFD')) {
      return false
    }

    return true
  } catch {
    return false
  }
}
