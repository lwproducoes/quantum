import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { createWriteStream, existsSync, readdirSync, readFileSync } from 'fs'
import { mkdir, unlink } from 'fs/promises'
import { get } from 'https'
import { Level } from 'level'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { SevenZip } from './services/7zip'
import { DatanodesApi } from './services/hosters/datanodes'
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

app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.jgco.quantum')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
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
    console.error('Failed to initialize settings DB:', err)
  }

  // Settings: get value by key
  ipcMain.handle('settings:get', async (_event, key: string) => {
    if (!settingsDb) return null
    try {
      const val = await settingsDb.get(key)
      return val ?? null
    } catch (err: any) {
      if (err && (err.notFound || err.code === 'LEVEL_NOT_FOUND')) return null
      console.error('settings:get error', err)
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
      console.error('settings:set error', err)
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
      console.error('cache:get error', err)
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
      console.error('cache:set error', err)
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
      console.error('cache:delete error', err)
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
      console.error('providers:list error', err)
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
          console.log(`providers:checkGame checking provider ${name} with ${list.length} items`)
          const item = list.find((it: any) => normalizeText(it?.title) === target)
          if (item) {
            matches.push({ provider: name, item })
          }
        } catch (err) {
          console.error(`providers:checkGame read ${indexPath} error`, err)
        }
      }

      return { providers: matches }
    } catch (err) {
      console.error('providers:checkGame error', err)
      return { providers: [] }
    }
  })

  // Download: start download with real-time progress
  ipcMain.handle(
    'download:start',
    async (
      event,
      downloadUrl: string,
      gameTitle: string,
      kind: 'base' | 'update' | 'dlc' = 'base'
    ) => {
      try {
        // Get download directory from settings
        const downloadDir = await settingsDb?.get('downloadFolder')
        if (!downloadDir) {
          throw new Error('Download directory not configured')
        }

        const baseDir = typeof downloadDir === 'string' ? downloadDir : String(downloadDir)
        const safeTitle = (gameTitle || 'game').replace(/[<>:"/\\|?*]+/g, '_')

        // Get real download URL from DatanodesApi
        console.log('Getting real download URL from:', downloadUrl)
        const realDownloadUrl = await DatanodesApi.getDownloadUrl(downloadUrl)
        console.log('Real download URL:', realDownloadUrl)

        // Extract filename from URL
        const targetRoot = join(baseDir, safeTitle)
        const subfolder = kind === 'update' ? 'Update' : kind === 'dlc' ? 'DLC' : ''
        const extractPath = subfolder ? join(targetRoot, subfolder) : targetRoot

        const filename = subfolder ? `${safeTitle}-${subfolder}.rar` : `${safeTitle}.rar`
        const filePath = join(targetRoot, filename)
        console.log('Resolved filename:', filename, filePath)

        // Ensure download directory exists
        await mkdir(extractPath, { recursive: true })
        console.log('Saving download to:', filePath)

        // Start download
        return new Promise((resolve, reject) => {
          get(realDownloadUrl, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download: ${response.statusCode}`))
              return
            }

            const totalSize = parseInt(response.headers['content-length'] || '0', 10)
            let downloadedSize = 0

            const fileStream = createWriteStream(filePath)

            response.on('data', (chunk) => {
              downloadedSize += chunk.length
              const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0

              // Send progress update to renderer
              event.sender.send('download:progress', {
                url: downloadUrl,
                progress,
                downloadedSize,
                totalSize,
                filename,
                kind
              })
            })

            response.pipe(fileStream)

            fileStream.on('finish', async () => {
              fileStream.close()

              // Extract the downloaded archive into the target path using SevenZip helper
              try {
                await SevenZip.extractFile({ filePath, outputPath: extractPath }, (progress) => {
                  const percent = typeof progress?.percent === 'number' ? progress.percent : 0
                  event.sender.send('download:extract-progress', {
                    url: downloadUrl,
                    progress: percent,
                    kind
                  })
                })

                // Remove archive after successful extraction
                try {
                  await unlink(filePath)
                } catch (cleanupErr) {
                  console.warn('Failed to delete archive after extraction:', cleanupErr)
                }

                event.sender.send('download:complete', {
                  url: downloadUrl,
                  filename,
                  filePath,
                  extractedTo: extractPath,
                  kind
                })
                resolve({ success: true, filePath })
              } catch (extractErr: any) {
                console.error('Extraction failed:', extractErr)
                event.sender.send('download:error', {
                  url: downloadUrl,
                  error: extractErr?.message || 'Extraction failed',
                  kind
                })
                reject(extractErr)
              }
            })

            fileStream.on('error', (err) => {
              fileStream.close()
              event.sender.send('download:error', {
                url: downloadUrl,
                error: err.message,
                kind
              })
              reject(err)
            })
          }).on('error', (err) => {
            event.sender.send('download:error', {
              url: downloadUrl,
              error: err.message,
              kind
            })
            reject(err)
          })
        })
      } catch (err: any) {
        console.error('download:start error', err)
        event.sender.send('download:error', {
          url: downloadUrl,
          error: err.message,
          kind
        })
        throw err
      }
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
