import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import { Provider } from './types'

// Custom APIs for renderer
const api = {
  selectDirectory: async (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:selectDirectory')
  },
  getSetting: async (key: string): Promise<any> => {
    return ipcRenderer.invoke('settings:get', key)
  },
  setSetting: async (key: string, value: any): Promise<boolean> => {
    return ipcRenderer.invoke('settings:set', key, value)
  },
  getCache: async (key: string): Promise<any> => {
    return ipcRenderer.invoke('cache:get', key)
  },
  setCache: async (key: string, value: any): Promise<boolean> => {
    return ipcRenderer.invoke('cache:set', key, value)
  },
  deleteCache: async (key: string): Promise<boolean> => {
    return ipcRenderer.invoke('cache:delete', key)
  },
  listProviders: async (): Promise<string[]> => {
    return ipcRenderer.invoke('providers:list')
  },
  checkGameProviders: async (
    title: string
  ): Promise<{ providers: Array<{ provider: string; item: any }> }> => {
    return ipcRenderer.invoke('providers:checkGame', title)
  },
  startDownload: async (
    downloadUrl: string,
    gameTitle: string,
    provider: Provider,
    kind: 'base' | 'update' | 'dlc' = 'base'
  ): Promise<{ success: boolean; filePath: string }> => {
    return ipcRenderer.invoke('download:start', downloadUrl, gameTitle, provider, kind)
  },
  cancelDownload: async (
    downloadUrl: string,
    kind: 'base' | 'update' | 'dlc' = 'base'
  ): Promise<boolean> => {
    return ipcRenderer.invoke('download:cancel', downloadUrl, kind)
  },
  onDownloadProgress: (
    callback: (data: {
      url: string
      progress: number
      downloadedSize: number
      totalSize: number
      filename: string
    }) => void
  ) => {
    ipcRenderer.on('download:progress', (_event, data) => callback(data))
  },
  onDownloadComplete: (
    callback: (data: { url: string; filename: string; filePath: string }) => void
  ) => {
    ipcRenderer.on('download:complete', (_event, data) => callback(data))
  },
  onDownloadStarted: (
    callback: (data: { url: string; provider: Provider; kind?: 'base' | 'update' | 'dlc' }) => void
  ) => {
    ipcRenderer.on('download:started', (_event, data) => callback(data))
  },
  onDownloadCancelled: (
    callback: (data: { url: string; kind?: 'base' | 'update' | 'dlc' }) => void
  ) => {
    ipcRenderer.on('download:cancelled', (_event, data) => callback(data))
  },
  onDownloadError: (callback: (data: { url: string; error: string }) => void) => {
    ipcRenderer.on('download:error', (_event, data) => callback(data))
  },
  removeDownloadListener: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
  // Updater APIs
  checkForUpdates: async (): Promise<void> => {
    return ipcRenderer.invoke('updater:check')
  },
  downloadUpdate: async (): Promise<void> => {
    return ipcRenderer.invoke('updater:download')
  },
  installUpdate: async (): Promise<void> => {
    return ipcRenderer.invoke('updater:install')
  },
  onUpdateMessage: (callback: (data: { event: string; data?: any }) => void) => {
    ipcRenderer.on('updater-message', (_event, data) => callback(data))
  },
  removeUpdateListener: () => {
    ipcRenderer.removeAllListeners('updater-message')
  },
  // Logger APIs
  log: (...args: any[]) => {
    ipcRenderer.send('logger:log', args)
  },
  error: (...args: any[]) => {
    ipcRenderer.send('logger:error', args)
  },
  warn: (...args: any[]) => {
    ipcRenderer.send('logger:warn', args)
  },
  info: (...args: any[]) => {
    ipcRenderer.send('logger:info', args)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('[Preload Error]', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
