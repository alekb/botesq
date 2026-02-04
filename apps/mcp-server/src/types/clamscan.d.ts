declare module 'clamscan' {
  interface ClamScanOptions {
    removeInfected?: boolean
    quarantineInfected?: boolean | string
    scanLog?: string | null
    debugMode?: boolean
    fileList?: string | null
    scanRecursively?: boolean
    clamscan?: {
      path?: string
      db?: string | null
      scanArchives?: boolean
      active?: boolean
    }
    clamdscan?: {
      socket?: string | null
      host?: string
      port?: number
      timeout?: number
      localFallback?: boolean
      path?: string
      configFile?: string | null
      multiscan?: boolean
      reloadDb?: boolean
      active?: boolean
      bypassTest?: boolean
    }
    preference?: 'clamscan' | 'clamdscan'
  }

  interface ScanResult {
    isInfected: boolean | null
    viruses?: string[]
    file?: string
  }

  class NodeClam {
    constructor()
    init(options?: ClamScanOptions): Promise<NodeClam>
    scanBuffer(buffer: Buffer): Promise<ScanResult>
    scanStream(stream: NodeJS.ReadableStream): Promise<ScanResult>
    scanFile(filePath: string): Promise<ScanResult>
    scanDir(dirPath: string): Promise<ScanResult>
    scanFiles(files: string[]): Promise<ScanResult[]>
    getVersion(): Promise<string | null>
    isInfected(filePath: string): Promise<ScanResult>
  }

  export = NodeClam
}
