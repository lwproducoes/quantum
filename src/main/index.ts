import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync, readdirSync, readFileSync, WriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { get } from 'https'
import { Level } from 'level'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { performDownload } from './performDownload'
import { DownloadQueue } from './services/download-queue'
import { DatanodesApi } from './services/hosters/datanodes'
import { logger } from './services/logger'
import { UpdaterService } from './services/updater'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    resizable: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let settingsDb: Level<string, any> | null = null
let updaterService: UpdaterService | null = null
const downloadQueue = new DownloadQueue()
export const activeDownloads = new Map<
  string,
  { request?: ReturnType<typeof get>; fileStream?: WriteStream }
>()
export const cancelledDownloads = new Set<string>()

const makeDownloadKey = (url: string, kind: 'base' | 'update' | 'dlc' = 'base') => `${url}::${kind}`

export type Provider = 'romslab' | 'nswpedia'
export type DownloadKind = 'base' | 'update' | 'dlc'

function normalizeTitle(str: string): string {
  // eslint-disable-next-line no-control-regex
  const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]/g
  return (str || 'game')
    .normalize('NFD')
    .replace(CONTROL_CHARS_RE, '')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replace('™', '')
    .replaceAll(/[<>:"/\\|?*]+/g, '_')
    .trim()
}

function buildPaths(baseDir: string, safeTitle: string, kind: DownloadKind) {
  const targetRoot = join(baseDir, safeTitle)
  const subfolder = kind === 'update' ? 'Update' : kind === 'dlc' ? 'DLC' : ''
  const extractPath = subfolder ? join(targetRoot, subfolder) : targetRoot
  const filename = subfolder ? `${safeTitle}-${subfolder}.rar` : `${safeTitle}.rar`
  const filePath = join(targetRoot, filename)
  return { targetRoot, extractPath, filename, filePath }
}

async function resolveRealDownloadUrl(provider: Provider, downloadUrl: string): Promise<string> {
  // For now all links are resolved via Datanodes; route by provider if needed later
  logger.debug('Getting real download URL from:', downloadUrl, 'provider:', provider)
  const real = await DatanodesApi.getDownloadUrl(downloadUrl)
  logger.debug('Real download URL:', real.slice(0, 20) + '...')
  return real
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.jgco.quantum')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Directory selection dialog
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled) return null
    return result.filePaths?.[0] ?? null
  })

  // Initialize LevelDB for settings
  try {
    const dbPath = join(app.getPath('userData'), 'settings')
    settingsDb = new Level<string, any>(dbPath, { valueEncoding: 'json' })
  } catch (err) {
    logger.error('Failed to initialize settings DB:', err)
  }

  // Settings: get value by key
  ipcMain.handle('settings:get', async (_event, key: string) => {
    if (!settingsDb) return null
    try {
      const val = await settingsDb.get(key)
      return val ?? null
    } catch (err: any) {
      if (err && (err.notFound || err.code === 'LEVEL_NOT_FOUND')) return null
      logger.error('settings:get error', err)
      return null
    }
  })

  // Settings: set value by key
  ipcMain.handle('settings:set', async (_event, key: string, value: any) => {
    if (!settingsDb) return false
    try {
      await settingsDb.put(key, value)
      return true
    } catch (err) {
      logger.error('settings:set error', err)
      return false
    }
  })

  // Cache: get value by key
  ipcMain.handle('cache:get', async (_event, key: string) => {
    if (!settingsDb) return null
    try {
      const val = await settingsDb.get(`cache:${key}`)
      return val ?? null
    } catch (err: any) {
      if (err && (err.notFound || err.code === 'LEVEL_NOT_FOUND')) return null
      logger.error('cache:get error', err)
      return null
    }
  })

  // Cache: set value by key
  ipcMain.handle('cache:set', async (_event, key: string, value: any) => {
    if (!settingsDb) return false
    try {
      await settingsDb.put(`cache:${key}`, value)
      return true
    } catch (err) {
      logger.error('cache:set error', err)
      return false
    }
  })

  // Cache: delete value by key
  ipcMain.handle('cache:delete', async (_event, key: string) => {
    if (!settingsDb) return false
    try {
      await settingsDb.del(`cache:${key}`)
      return true
    } catch (err: any) {
      if (err && (err.notFound || err.code === 'LEVEL_NOT_FOUND')) return true
      logger.error('cache:delete error', err)
      return false
    }
  })

  // Providers: list available providers by folder
  ipcMain.handle('providers:list', async () => {
    try {
      const providersRoot = resolveProvidersRoot()
      const entries = readdirSync(providersRoot, { withFileTypes: true })
      const providers = entries
        .filter((e) => e.isDirectory() && existsSync(join(providersRoot, e.name, 'index.json')))
        .map((e) => e.name)
      return providers
    } catch (err) {
      logger.error('providers:list error', err)
      return []
    }
  })

  // Providers: check if a game exists in any provider (accent/case-insensitive)
  ipcMain.handle('providers:checkGame', async (_event, title: string) => {
    function normalizeText(str: string): string {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace('™', '')
        .toLowerCase()
        .trim()
    }

    try {
      const providersRoot = resolveProvidersRoot()
      const entries = readdirSync(providersRoot, { withFileTypes: true })
      const target = normalizeText(title)
      const matches: Array<{ provider: string; item: any }> = []

      for (const e of entries) {
        if (!e.isDirectory()) continue
        const name = e.name
        const indexPath = join(providersRoot, name, 'index.json')
        if (!existsSync(indexPath)) continue
        try {
          const content = readFileSync(indexPath, 'utf-8')
          const list: any[] = JSON.parse(content)
          logger.debug(`providers:checkGame checking provider ${name} with ${list.length} items`)
          const item = list.find((it: any) => normalizeText(it?.title) === target)
          if (item) {
            matches.push({ provider: name, item })
          }
        } catch (err) {
          logger.error(`providers:checkGame read ${indexPath} error`, err)
        }
      }

      return { providers: matches }
    } catch (err) {
      logger.error('providers:checkGame error', err)
      return { providers: [] }
    }
  })

  // Download: start download with real-time progress, queued sequentially
  ipcMain.handle(
    'download:start',
    async (
      event,
      downloadUrl: string,
      gameTitle: string,
      provider: Provider,
      kind: DownloadKind = 'base'
    ) => {
      const webContents = event.sender
      try {
        // Prepare parameters up-front (fetch real URL, paths) before enqueue
        const downloadDir = await settingsDb?.get('downloadFolder')
        if (!downloadDir) {
          throw new Error('Download directory not configured')
        }

        const baseDir = typeof downloadDir === 'string' ? downloadDir : String(downloadDir)
        const safeTitle = normalizeTitle(gameTitle)
        const realDownloadUrl = await resolveRealDownloadUrl(provider, downloadUrl)
        const { extractPath, filename, filePath } = buildPaths(baseDir, safeTitle, kind)
        await mkdir(extractPath, { recursive: true })

        const downloadKey = makeDownloadKey(downloadUrl, kind)
        cancelledDownloads.delete(downloadKey)

        // Enqueue the actual download task to run sequentially
        return downloadQueue.enqueue(async () => {
          if (cancelledDownloads.has(downloadKey)) {
            cancelledDownloads.delete(downloadKey)
            webContents.send('download:cancelled', { url: downloadUrl, kind })
            return { success: false, filePath }
          }

          // Notify renderer that this queued task started
          webContents.send('download:started', { url: downloadUrl, kind })
          return await performDownload({
            webContents,
            realDownloadUrl,
            downloadUrl,
            filename,
            filePath,
            extractPath,
            kind,
            provider,
            downloadKey
          })
        })
      } catch (err: any) {
        logger.error('download:start error', err)
        webContents.send('download:error', {
          url: downloadUrl,
          error: err.message,
          kind
        })
        throw err
      }
    }
  )

  ipcMain.handle(
    'download:cancel',
    async (_event, downloadUrl: string, kind: 'base' | 'update' | 'dlc' = 'base') => {
      const key = makeDownloadKey(downloadUrl, kind)
      cancelledDownloads.add(key)

      const active = activeDownloads.get(key)
      try {
        active?.request?.destroy(new Error('Download cancelled'))
        active?.fileStream?.destroy(new Error('Download cancelled'))
      } catch (err) {
        logger.warn('download:cancel cleanup warning', err)
      }

      return true
    }
  )

  // IPC handlers for updater
  ipcMain.handle('updater:check', async () => {
    if (updaterService) {
      await updaterService.checkForUpdates()
    }
  })

  ipcMain.handle('updater:download', async () => {
    if (updaterService) {
      await updaterService.downloadUpdate()
    }
  })

  ipcMain.handle('updater:install', () => {
    if (updaterService) {
      updaterService.quitAndInstall()
    }
  })

  // Logger handlers
  ipcMain.on('logger:log', (_event, args: any[]) => {
    logger.log(...args)
  })
  ipcMain.on('logger:error', (_event, args: any[]) => {
    logger.error(...args)
  })
  ipcMain.on('logger:warn', (_event, args: any[]) => {
    logger.warn(...args)
  })
  ipcMain.on('logger:info', (_event, args: any[]) => {
    logger.info(...args)
  })

  createWindow()

  // Initialize updater service after window is created
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    updaterService = new UpdaterService(mainWindow)
    // Check for updates 3 seconds after app start
    setTimeout(() => {
      if (updaterService && !is.dev) {
        updaterService.checkForUpdates()
      }
    }, 3000)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Resolve providers folder in dev vs packaged
function resolveProvidersRoot(): string {
  // In packaged apps, resourcesPath points to where extraResources are copied
  const prodPath = join(process.resourcesPath, 'providers')
  if (existsSync(prodPath)) return prodPath

  // In development, read directly from source tree
  const devPath1 = join(__dirname, '../../src/main/providers')
  if (existsSync(devPath1)) return devPath1

  const devPath2 = join(process.cwd(), 'src', 'main', 'providers')
  if (existsSync(devPath2)) return devPath2

  // Fallback to a sibling in compiled dir (if copied by tooling)
  const devPath3 = join(__dirname, 'providers')
  return devPath3
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
