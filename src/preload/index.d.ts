import { ElectronAPI } from '@electron-toolkit/preload'
import type { Provider } from './types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectDirectory: () => Promise<string | null>
      getSetting: (key: string) => Promise<any>
      setSetting: (key: string, value: any) => Promise<boolean>
      getCache: (key: string) => Promise<any>
      setCache: (key: string, value: any) => Promise<boolean>
      deleteCache: (key: string) => Promise<boolean>
      listProviders: () => Promise<string[]>
      checkGameProviders: (
        title: string
      ) => Promise<{ providers: Array<{ provider: Provider; item: any }> }>
      startDownload: (
        downloadUrl: string,
        gameTitle: string,
        provider: Provider,
        kind?: 'base' | 'update' | 'dlc'
      ) => Promise<{ success: boolean; filePath: string }>
      cancelDownload: (downloadUrl: string, kind?: 'base' | 'update' | 'dlc') => Promise<boolean>
      onDownloadProgress: (
        callback: (data: {
          url: string
          progress: number
          downloadedSize: number
          totalSize: number
          filename: string
        }) => void
      ) => void
      onDownloadComplete: (
        callback: (data: { url: string; filename: string; filePath: string }) => void
      ) => void
      onDownloadStarted: (
        callback: (data: {
          url: string
          provider: Provider
          kind?: 'base' | 'update' | 'dlc'
        }) => void
      ) => void
      onDownloadCancelled: (
        callback: (data: { url: string; kind?: 'base' | 'update' | 'dlc' }) => void
      ) => void
      onDownloadError: (callback: (data: { url: string; error: string }) => void) => void
      removeDownloadListener: (channel: string) => void
      // Updater
      checkForUpdates: () => Promise<void>
      downloadUpdate: () => Promise<void>
      installUpdate: () => Promise<void>
      onUpdateMessage: (callback: (data: { event: string; data?: any }) => void) => void
      removeUpdateListener: () => void
    }
  }
}
