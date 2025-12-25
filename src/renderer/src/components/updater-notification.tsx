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
      console.log('Update event:', data)

      switch (data.event) {
        case 'checking-for-update':
          console.log('Verificando atualizações...')
          break

        case 'update-available':
          setUpdateAvailable(true)
          setUpdateInfo(data.data)
          setShowDialog(true)
          toast.info(`Nova versão disponível: ${data.data?.version || 'unknown'}`, {
            autoClose: 5000
          })
          break

        case 'update-not-available':
          console.log('Nenhuma atualização disponível')
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
          toast.success('Atualização baixada! Reinicie para instalar.', {
            autoClose: false
          })
          break

        case 'update-error':
          setDownloading(false)
          toast.error(`Erro ao atualizar: ${data.data?.message || 'Erro desconhecido'}`, {
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
    toast.info('Baixando atualização...', { autoClose: 2000 })
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
            <DialogTitle>Atualização Disponível</DialogTitle>
            <DialogDescription>
              Uma nova versão ({updateInfo?.version}) está disponível. Deseja baixar agora?
              {updateInfo?.releaseNotes && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded bg-gray-100 p-3 text-sm dark:bg-gray-800">
                  <p className="whitespace-pre-wrap">{updateInfo.releaseNotes}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDismiss}>
              Mais tarde
            </Button>
            <Button onClick={handleDownloadUpdate}>Baixar atualização</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Downloaded Dialog */}
      <Dialog open={showDialog && updateDownloaded} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualização Pronta</DialogTitle>
            <DialogDescription>
              A atualização foi baixada com sucesso. O aplicativo será reiniciado para concluir a
              instalação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Instalar depois
            </Button>
            <Button onClick={handleInstallUpdate}>Reiniciar e instalar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Progress Toast */}
      {downloading && downloadProgress > 0 && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
          <p className="mb-2 text-sm font-medium">Baixando atualização...</p>
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
