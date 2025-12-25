import logger from '@renderer/lib/logger'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './dialog'

interface UpdateInfo {
  version: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  transferred: number
  total: number
}

export function UpdaterNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    const handleUpdateMessage = (data: { event: string; data?: any }) => {
      logger.log('Update event:', data)

      switch (data.event) {
        case 'checking-for-update':
          logger.log('Checking for updates...')
          break

        case 'update-available':
          setUpdateAvailable(true)
          setUpdateInfo(data.data)
          setShowDialog(true)
          toast.info(`New version available: ${data.data?.version || 'unknown'}`, {
            autoClose: 5000
          })
          break

        case 'update-not-available':
          logger.log('No update available')
          break

        case 'update-download-progress': {
          setDownloading(true)
          const progress = data.data as DownloadProgress
          setDownloadProgress(Math.round(progress.percent))
          break
        }

        case 'update-downloaded':
          setDownloading(false)
          setUpdateDownloaded(true)
          setShowDialog(true)
          toast.success('Update downloaded! Restart to install.', {
            autoClose: false
          })
          break

        case 'update-error':
          setDownloading(false)
          toast.error(`Error updating: ${data.data?.message || 'Unknown error'}`, {
            autoClose: 5000
          })
          break
      }
    }

    window.api.onUpdateMessage(handleUpdateMessage)

    return () => {
      window.api.removeUpdateListener()
    }
  }, [])

  const handleDownloadUpdate = async () => {
    setShowDialog(false)
    setDownloading(true)
    toast.info('Downloading update...', { autoClose: 2000 })
    await window.api.downloadUpdate()
  }

  const handleInstallUpdate = async () => {
    await window.api.installUpdate()
  }

  const handleDismiss = () => {
    setShowDialog(false)
    setUpdateAvailable(false)
  }

  return (
    <>
      {/* Update Available Dialog */}
      <Dialog
        open={showDialog && updateAvailable && !updateDownloaded}
        onOpenChange={setShowDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Available</DialogTitle>
            <DialogDescription className="">
              A new version ({updateInfo?.version}) is available. Do you want to download now?
              {updateInfo?.releaseNotes && (
                <div
                  className="mt-4 max-h-48 overflow-y-auto rounded bg-gray-100 p-3 text-sm dark:bg-gray-800 prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
                />
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDismiss}>
              Later
            </Button>
            <Button onClick={handleDownloadUpdate}>Download Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Downloaded Dialog */}
      <Dialog open={showDialog && updateDownloaded} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Ready</DialogTitle>
            <DialogDescription>
              The update has been downloaded successfully. The application will restart to complete
              the installation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Install Later
            </Button>
            <Button onClick={handleInstallUpdate}>Restart and Install</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Progress Toast */}
      {downloading && downloadProgress > 0 && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
          <p className="mb-2 text-sm font-medium">Downloading update...</p>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">{downloadProgress}%</p>
        </div>
      )}
    </>
  )
}
