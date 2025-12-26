// Main process types
export type Provider = 'romslab' | 'nswpedia'
export type DownloadKind = 'base' | 'update' | 'dlc'

// Download queue types
export type QueueTask<T = any> = () => Promise<T>

export interface PendingTask<T = any> {
  task: QueueTask<T>
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

// 7zip service types
export interface ExtractionProgress {
  percent: number
  fileCount: number
  file: string
}

export interface ExtractionResult {
  success: boolean
  extractedFiles: string[]
}

export interface ProviderGameItem {
  title: string
  data: {
    download?: string
    update?: string
    dlc?: string
  }
}
