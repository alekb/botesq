import NodeClam from 'clamscan'
import pino from 'pino'
import { config } from '../config.js'
import { ApiError } from '../types.js'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

let clamInstance: NodeClam | null = null
let initializationPromise: Promise<NodeClam> | null = null

/**
 * Virus scan result
 */
export interface ScanResult {
  isInfected: boolean
  viruses: string[]
  scannedAt: Date
  scanDurationMs: number
}

/**
 * Check if virus scanning is configured
 */
export function isVirusScanEnabled(): boolean {
  return config.clamav?.enabled ?? false
}

/**
 * Initialize ClamAV scanner
 * Uses lazy initialization to avoid blocking startup
 */
async function getScanner(): Promise<NodeClam> {
  if (clamInstance) {
    return clamInstance
  }

  // Prevent multiple concurrent initializations
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = initializeScanner()
  clamInstance = await initializationPromise
  initializationPromise = null

  return clamInstance
}

async function initializeScanner(): Promise<NodeClam> {
  const clamConfig = config.clamav

  if (!clamConfig?.enabled) {
    throw new ApiError('VIRUS_SCAN_DISABLED', 'Virus scanning is not enabled', 503)
  }

  logger.info({ host: clamConfig.host, port: clamConfig.port }, 'Initializing ClamAV connection')

  try {
    const clamscan = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: process.env.NODE_ENV === 'development',
      fileList: null,
      scanRecursively: false,
      clamscan: {
        path: clamConfig.clamscanPath ?? '/usr/bin/clamscan',
        db: null,
        scanArchives: true,
        active: clamConfig.mode === 'local',
      },
      clamdscan: {
        socket: clamConfig.socket ?? null,
        host: clamConfig.host ?? '127.0.0.1',
        port: clamConfig.port ?? 3310,
        timeout: clamConfig.timeout ?? 60000,
        localFallback: true,
        path: clamConfig.clamdscanPath ?? '/usr/bin/clamdscan',
        configFile: null,
        multiscan: false,
        reloadDb: false,
        active: clamConfig.mode === 'daemon',
        bypassTest: false,
      },
      preference: clamConfig.mode === 'daemon' ? 'clamdscan' : 'clamscan',
    })

    logger.info('ClamAV initialized successfully')
    return clamscan
  } catch (error) {
    logger.error({ error }, 'Failed to initialize ClamAV')
    throw new ApiError(
      'VIRUS_SCAN_INIT_FAILED',
      'Failed to initialize virus scanner. Check ClamAV configuration.',
      503
    )
  }
}

/**
 * Scan a buffer for viruses
 * @param buffer - File content to scan
 * @param filename - Original filename (for logging)
 * @returns Scan result
 */
export async function scanBuffer(buffer: Buffer, filename?: string): Promise<ScanResult> {
  if (!isVirusScanEnabled()) {
    logger.warn('Virus scanning disabled, skipping scan')
    return {
      isInfected: false,
      viruses: [],
      scannedAt: new Date(),
      scanDurationMs: 0,
    }
  }

  const startTime = Date.now()
  const scanner = await getScanner()

  logger.debug({ filename, size: buffer.length }, 'Starting virus scan')

  try {
    const { isInfected, viruses } = await scanner.scanBuffer(buffer)

    const duration = Date.now() - startTime

    if (isInfected) {
      logger.warn({ filename, viruses, durationMs: duration }, 'Virus detected in file')
    } else {
      logger.debug({ filename, durationMs: duration }, 'File scan completed - clean')
    }

    return {
      isInfected: isInfected ?? false,
      viruses: viruses ?? [],
      scannedAt: new Date(),
      scanDurationMs: duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error({ error, filename, durationMs: duration }, 'Virus scan failed')

    // In production, fail closed - reject files that can't be scanned
    if (config.env === 'production') {
      throw new ApiError(
        'VIRUS_SCAN_FAILED',
        'Unable to complete virus scan. Please try again.',
        503
      )
    }

    // In development, log and allow (scanner might not be running)
    logger.warn('Allowing file due to scan failure in non-production environment')
    return {
      isInfected: false,
      viruses: [],
      scannedAt: new Date(),
      scanDurationMs: duration,
    }
  }
}

/**
 * Scan a file stream for viruses
 * @param stream - Readable stream of file content
 * @param filename - Original filename (for logging)
 * @returns Scan result
 */
export async function scanStream(
  stream: NodeJS.ReadableStream,
  filename?: string
): Promise<ScanResult> {
  if (!isVirusScanEnabled()) {
    logger.warn('Virus scanning disabled, skipping scan')
    return {
      isInfected: false,
      viruses: [],
      scannedAt: new Date(),
      scanDurationMs: 0,
    }
  }

  const startTime = Date.now()
  const scanner = await getScanner()

  logger.debug({ filename }, 'Starting virus scan on stream')

  try {
    const { isInfected, viruses } = await scanner.scanStream(stream)

    const duration = Date.now() - startTime

    if (isInfected) {
      logger.warn({ filename, viruses, durationMs: duration }, 'Virus detected in stream')
    } else {
      logger.debug({ filename, durationMs: duration }, 'Stream scan completed - clean')
    }

    return {
      isInfected: isInfected ?? false,
      viruses: viruses ?? [],
      scannedAt: new Date(),
      scanDurationMs: duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error({ error, filename, durationMs: duration }, 'Stream virus scan failed')

    if (config.env === 'production') {
      throw new ApiError(
        'VIRUS_SCAN_FAILED',
        'Unable to complete virus scan. Please try again.',
        503
      )
    }

    logger.warn('Allowing stream due to scan failure in non-production environment')
    return {
      isInfected: false,
      viruses: [],
      scannedAt: new Date(),
      scanDurationMs: duration,
    }
  }
}

/**
 * Check if ClamAV daemon is reachable
 * Useful for health checks
 */
export async function checkHealth(): Promise<{
  healthy: boolean
  version?: string
  error?: string
}> {
  if (!isVirusScanEnabled()) {
    return { healthy: true, version: 'disabled' }
  }

  try {
    const scanner = await getScanner()
    const version = await scanner.getVersion()

    return {
      healthy: true,
      version: version ?? 'unknown',
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Reset the scanner instance (useful for testing)
 */
export function resetScanner(): void {
  clamInstance = null
  initializationPromise = null
}
