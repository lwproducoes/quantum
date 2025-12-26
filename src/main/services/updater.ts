import { BrowserWindow } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'

// Configure logging
autoUpdater.logger = log
log.transports.file.level = 'info'

export class UpdaterService {
  private readonly mainWindow: BrowserWindow | null = null

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.setupAutoUpdater()
  }

  private setupAutoUpdater(): void {
    // Disable auto-download - we'll control this manually
    autoUpdater.autoDownload = false

    // Check for updates on app start (after a delay)
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates...')
      this.sendStatusToWindow('checking-for-update')
    })

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info)
      this.sendStatusToWindow('update-available', info)
    })

    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info)
      this.sendStatusToWindow('update-not-available', info)
    })

    autoUpdater.on('error', (err) => {
      log.error('Error in auto-updater:', err)
      this.sendStatusToWindow('update-error', { message: err.message })
    })

    autoUpdater.on('download-progress', (progressObj) => {
      log.info('Download progress:', progressObj)
      this.sendStatusToWindow('update-download-progress', progressObj)
    })

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info)
      this.sendStatusToWindow('update-downloaded', info)
    })
  }

  private sendStatusToWindow(event: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater-message', { event, data })
    }
  }

  public async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      log.error('Error checking for updates:', err)
    }
  }

  public async downloadUpdate(): Promise<void> {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      log.error('Error downloading update:', err)
    }
  }

  public quitAndInstall(): void {
    autoUpdater.quitAndInstall(false, true)
  }
}
