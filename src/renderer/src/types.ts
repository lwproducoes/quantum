// eslint-disable-next-line @typescript-eslint/no-unused-vars
const providers = ['romslab', 'nswpedia'] as const
export type Provider = (typeof providers)[number]

// Shared game interface
export interface Game {
  id: string
  title: string
  description: string
  imageBoxArt: string
}

// Download types
export type DownloadPartKind = 'base' | 'update' | 'dlc'

export interface DownloadPart {
  id: string
  url: string
  label: string
  kind: DownloadPartKind
  status: 'queued' | 'downloading' | 'completed' | 'error' | 'canceled'
  progress: number
  downloadedBytes: number
  totalBytes: number
  speedBytesPerSecond?: number
  etaSeconds?: number
  lastUpdatedAt?: number
}

export interface DownloadItem {
  id: string
  game: Game
  progress: number
  status: 'queued' | 'downloading' | 'completed' | 'error' | 'canceled'
  downloadedBytes: number
  totalBytes: number
  parts: DownloadPart[]
  speedBytesPerSecond?: number
  etaSeconds?: number
}

// Cache types
export interface CacheEntry<T = any> {
  data: T
  timestamp: number
}
