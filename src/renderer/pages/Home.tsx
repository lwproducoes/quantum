import { DialogDescription } from '@radix-ui/react-dialog'
import { fetchGames, getDownloadFolder } from '@renderer/lib/api'
import logger from '@renderer/lib/logger'
import { Download, LoaderCircle, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { toast } from 'react-toastify'
import { Button } from '../src/components/button'
import { Card, CardContent, CardTitle } from '../src/components/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../src/components/dialog'
import { Drawer } from '../src/components/drawer'
import { Input } from '../src/components/input'
import { DownloadItem, DownloadPart, Game, Provider } from '../src/types'
import Downloads from './Downloads'

const MIN_SPEED_INTERVAL_SECONDS = 0.1

function Home(): React.JSX.Element {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [catalogue, setCatalogue] = useState<Game[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [providersLoading, setProvidersLoading] = useState(false)
  const [providerMatches, setProviderMatches] = useState<Array<{ provider: Provider; item: any }>>(
    []
  )

  // Setup download listeners
  useEffect(() => {
    const aggregateSpeed = (parts: DownloadPart[]) =>
      parts.reduce((sum, p) => sum + (p.speedBytesPerSecond ?? 0), 0)

    const handleProgress = (data: {
      url: string
      progress: number
      downloadedSize: number
      totalSize: number
      filename: string
      kind?: 'base' | 'update' | 'dlc'
    }) => {
      const now = Date.now()
      setDownloads((prev) =>
        prev.map((d) => {
          const part = d.parts.find((p) => p.url === data.url)
          if (!part) return d
          const timeDiffSeconds = part.lastUpdatedAt ? (now - part.lastUpdatedAt) / 1000 : 0
          const deltaBytes = data.downloadedSize - part.downloadedBytes
          const elapsedSeconds = timeDiffSeconds > 0 ? timeDiffSeconds : 0
          const normalizedElapsed =
            elapsedSeconds < MIN_SPEED_INTERVAL_SECONDS ? MIN_SPEED_INTERVAL_SECONDS : elapsedSeconds
          const currentSpeed =
            part.lastUpdatedAt && deltaBytes >= 0
              ? deltaBytes / normalizedElapsed
              : part.speedBytesPerSecond || 0
          const remainingBytesForPart =
            data.totalSize > 0 ? Math.max(data.totalSize - data.downloadedSize, 0) : 0
          const partEta =
            currentSpeed > 0 && remainingBytesForPart > 0
              ? remainingBytesForPart / currentSpeed
              : undefined

          const updatedParts = d.parts.map((p) =>
            p.url === data.url
              ? {
                  ...p,
                  progress: data.progress,
                  downloadedBytes: data.downloadedSize,
                  totalBytes: data.totalSize || p.totalBytes,
                  status: 'downloading' as const,
                  speedBytesPerSecond: currentSpeed > 0 ? currentSpeed : undefined,
                  etaSeconds: partEta,
                  lastUpdatedAt: now
                }
              : p
          )

          const totalBytes = updatedParts.reduce(
            (sum, p) => sum + (p.totalBytes > 0 ? p.totalBytes : 0),
            0
          )
          const downloadedBytes = updatedParts.reduce((sum, p) => sum + p.downloadedBytes, 0)

          const totalSpeed = aggregateSpeed(updatedParts)
          const remainingBytes = totalBytes > 0 ? Math.max(totalBytes - downloadedBytes, 0) : 0
          const etaSeconds =
            totalSpeed > 0 && remainingBytes > 0 ? remainingBytes / totalSpeed : undefined

          const progressVal =
            totalBytes > 0
              ? Math.min((downloadedBytes / totalBytes) * 100, 100)
              : updatedParts.reduce((sum, p) => sum + p.progress, 0) / updatedParts.length

          return {
            ...d,
            parts: updatedParts,
            totalBytes,
            downloadedBytes,
            progress: progressVal,
            status: 'downloading',
            speedBytesPerSecond: totalSpeed > 0 ? totalSpeed : undefined,
            etaSeconds
          }
        })
      )
    }

    const handleComplete = (data: {
      url: string
      filename: string
      filePath: string
      kind?: 'base' | 'update' | 'dlc'
    }) => {
      setDownloads((prev) =>
        prev.map((d) => {
          const part = d.parts.find((p) => p.url === data.url)
          if (!part) return d

          const updatedParts = d.parts.map((p) =>
            p.url === data.url ? { ...p, status: 'completed' as const, progress: 100 } : p
          )

          const allCompleted = updatedParts.every((p) => p.status === 'completed')
          const totalBytes = updatedParts.reduce(
            (sum, p) => sum + (p.totalBytes > 0 ? p.totalBytes : 0),
            0
          )
          const downloadedBytes = updatedParts.reduce((sum, p) => sum + p.downloadedBytes, 0)
          const totalSpeed = aggregateSpeed(updatedParts)
          const remainingBytes = totalBytes > 0 ? Math.max(totalBytes - downloadedBytes, 0) : 0
          const etaSeconds =
            totalSpeed > 0 && remainingBytes > 0 ? remainingBytes / totalSpeed : undefined

          return {
            ...d,
            parts: updatedParts,
            status: allCompleted ? 'completed' : 'downloading',
            progress: allCompleted ? 100 : d.progress,
            totalBytes,
            downloadedBytes,
            speedBytesPerSecond:
              allCompleted || totalSpeed <= 0 ? undefined : totalSpeed,
            etaSeconds: allCompleted ? undefined : etaSeconds
          }
        })
      )
    }

    const handleError = (data: {
      url: string
      error: string
      kind?: 'base' | 'update' | 'dlc'
    }) => {
      logger.error('Download error:', data.error)
      setDownloads((prev) =>
        prev.map((d) => {
          const part = d.parts.find((p) => p.url === data.url)
          if (!part) return d

          const updatedParts = d.parts.map((p) =>
            p.url === data.url ? { ...p, status: 'error' as const } : p
          )

          return {
            ...d,
            parts: updatedParts,
            status: 'error',
            speedBytesPerSecond: undefined,
            etaSeconds: undefined
          }
        })
      )
    }

    const handleCancelled = (data: { url: string; kind?: 'base' | 'update' | 'dlc' }) => {
      setDownloads((prev) =>
        prev.map((d) => {
          const part = d.parts.find((p) => p.url === data.url)
          if (!part) return d

          const updatedParts = d.parts.map((p) =>
            p.url === data.url
              ? { ...p, status: 'canceled' as const, progress: 0, downloadedBytes: 0 }
              : p
          )

          const allCanceled = updatedParts.every((p) => p.status === 'canceled')

          return {
            ...d,
            parts: updatedParts,
            status: allCanceled ? ('canceled' as const) : d.status,
            progress: allCanceled ? 0 : d.progress,
            downloadedBytes: allCanceled ? 0 : d.downloadedBytes,
            totalBytes: allCanceled ? 0 : d.totalBytes,
            speedBytesPerSecond: undefined,
            etaSeconds: undefined
          }
        })
      )
    }

    const handleStarted = (data: {
      url: string
      provider: Provider
      kind?: 'base' | 'update' | 'dlc'
    }) => {
      setDownloads((prev) =>
        prev.map((d) => {
          const part = d.parts.find((p) => p.url === data.url)
          if (!part) return d
          const updatedParts = d.parts.map((p) =>
            p.url === data.url ? { ...p, status: 'downloading' as const } : p
          )
          return { ...d, parts: updatedParts, status: 'downloading' }
        })
      )
    }

    window.api.onDownloadProgress(handleProgress)
    window.api.onDownloadComplete(handleComplete)
    window.api.onDownloadError(handleError)
    window.api.onDownloadStarted(handleStarted)
    window.api.onDownloadCancelled(handleCancelled)

    return () => {
      window.api.removeDownloadListener('download:progress')
      window.api.removeDownloadListener('download:complete')
      window.api.removeDownloadListener('download:error')
      window.api.removeDownloadListener('download:started')
      window.api.removeDownloadListener('download:cancelled')
    }
  }, [])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const useCache = isInitialLoad && !search
      setLoading(true)
      const response = await fetchGames(search, useCache)
      setCatalogue(response.data)

      if (isInitialLoad) {
        setIsInitialLoad(false)
      } else {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [search, isInitialLoad])

  // Check providers when a game is selected
  useEffect(() => {
    const run = async () => {
      if (!selectedGame) {
        setProviderMatches([])
        setProvidersLoading(false)
        return
      }
      setProvidersLoading(true)
      try {
        const res = await window.api.checkGameProviders(selectedGame.title)
        console.log(res)
        setProviderMatches(res?.providers ?? [])
      } catch (err) {
        logger.error('Error checking providers:', err)
        setProviderMatches([])
      } finally {
        setProvidersLoading(false)
      }
    }
    run()
  }, [selectedGame])

  const handleStartDownload = async (
    game: Game,
    provider: Provider,
    downloadUrl: string,
    updateUrl?: string,
    dlcUrl?: string
  ) => {
    const downloadFolder = await getDownloadFolder()
    if (!downloadFolder) {
      toast.error('Download folder not configured! Go to Settings.', {
        position: 'top-right'
      })
      navigate('/settings')
      return
    }

    const downloadId = `${downloadUrl}-${Date.now()}`
    logger.log('Starting download for:', game.title, 'from', downloadUrl)

    const parts: DownloadPart[] = [
      {
        id: `${downloadId}-base`,
        url: downloadUrl,
        label: 'Base',
        kind: 'base',
        status: 'downloading',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0
      }
    ]

    if (updateUrl) {
      parts.push({
        id: `${downloadId}-update`,
        url: updateUrl,
        label: 'Update',
        kind: 'update',
        status: 'downloading',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0
      })
    }

    if (dlcUrl) {
      parts.push({
        id: `${downloadId}-dlc`,
        url: dlcUrl,
        label: 'DLC',
        kind: 'dlc',
        status: 'downloading',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0
      })
    }

    const newDownload: DownloadItem = {
      id: downloadId,
      game,
      progress: 0,
      status: downloads.some((d) => d.status === 'downloading') ? 'queued' : 'downloading',
      downloadedBytes: 0,
      totalBytes: 0,
      parts
    }

    setDownloads((prev) => [...prev, newDownload])
    setIsDrawerOpen(true)
    setSelectedGame(null)

    // Enqueue all parts; queue ensures sequential execution
    await Promise.all(
      parts.map(async (part) => {
        try {
          await window.api.startDownload(part.url, game.title, provider, part.kind)
        } catch (err: any) {
          logger.error('Failed to start download:', err)
          setDownloads((prev) =>
            prev.map((d) =>
              d.id === downloadId
                ? {
                    ...d,
                    status: 'error',
                    parts: d.parts.map((p) => (p.url === part.url ? { ...p, status: 'error' } : p))
                  }
                : d
            )
          )
        }
      })
    )
  }

  const removeDownload = async (id: string) => {
    const target = downloads.find((d) => d.id === id)
    if (!target) return

    await Promise.all(
      target.parts.map(async (part) => {
        try {
          await window.api.cancelDownload(part.url, part.kind)
        } catch (err) {
          logger.error('Failed to cancel download', err)
        }
      })
    )

    setDownloads((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="h-screen flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex w-full gap-2 mb-4">
        <Input
          placeholder="Search games"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="Downloads"
          onClick={() => setIsDrawerOpen(true)}
          className="relative"
        >
          <Download />
          {downloads.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {downloads.length}
            </span>
          )}
        </Button>
        <NavLink to="/settings">
          <Button variant="outline" size="icon" aria-label="Settings">
            <Settings />
          </Button>
        </NavLink>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {catalogue.map((game) => (
              <Card
                key={game.id}
                className="cursor-pointer pb-4"
                onClick={() => setSelectedGame(game)}
              >
                <img src={game.imageBoxArt} className="w-5xl h-5xl" alt={game.title} />
                <CardContent>
                  <CardTitle className="text-sm">{game.title}</CardTitle>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center h-full flex items-center justify-center">
            <LoaderCircle className="animate-spin" />
          </div>
        )}
      </div>

      {/* Download Options Dialog */}
      <Dialog open={!!selectedGame} onOpenChange={(open) => !open && setSelectedGame(null)}>
        <DialogContent>
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-bold">Download options</DialogTitle>
            <DialogDescription>Choose how you want to download</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-3">
            {providersLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <LoaderCircle className="animate-spin" />
                <span>Checking providers...</span>
              </div>
            )}

            {!providersLoading && providerMatches.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No providers available for this game.
              </div>
            )}

            {!providersLoading && providerMatches.length > 0 && (
              <>
                {providerMatches.map((pm) => (
                  <Card
                    key={`${pm.provider}-${pm.item?.title}`}
                    className="cursor-pointer hover:bg-accent transition-colors select-none"
                    onClick={() => {
                      if (!selectedGame) return
                      const baseUrl = pm.item?.data?.download || pm.item?.download
                      const updateUrl = pm.item?.data?.update || pm.item?.update
                      const dlcUrl = pm.item?.data?.dlc || pm.item?.dlc
                      if (baseUrl) {
                        handleStartDownload(selectedGame, pm.provider, baseUrl, updateUrl, dlcUrl)
                      }
                    }}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Download className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">
                          Direct Download - {pm.provider.toUpperCase()}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Direct server download</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Downloads Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} title="Downloads">
        <Downloads downloads={downloads} onRemoveDownload={removeDownload} />
      </Drawer>
    </div>
  )
}

export default Home
