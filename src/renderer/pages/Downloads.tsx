import { Download, X } from 'lucide-react'
import { Button } from '../src/components/button'
import { Card, CardContent, CardTitle } from '../src/components/card'
import { cn } from '../src/lib/utils'
import { Game } from '../src/types'

export type DownloadPartKind = 'base' | 'update' | 'dlc'

export interface DownloadPart {
  id: string
  url: string
  label: string
  kind: DownloadPartKind
  status: 'downloading' | 'completed' | 'error'
  progress: number
  downloadedBytes: number
  totalBytes: number
}

export interface DownloadItem {
  id: string
  game: Game
  progress: number
  status: 'downloading' | 'completed' | 'error'
  downloadedBytes: number
  totalBytes: number
  parts: DownloadPart[]
}

interface DownloadsProps {
  downloads: DownloadItem[]
  onRemoveDownload: (id: string) => void
}

function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** idx
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${units[idx]}`
}

function Downloads({ downloads, onRemoveDownload }: DownloadsProps): React.JSX.Element {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {downloads.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <Download className="mx-auto mb-2 opacity-50" size={48} />
            <p>No active downloads</p>
          </div>
        ) : (
          downloads.map((download) => (
            <Card key={download.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={download.game.imageBoxArt}
                    className="w-16 h-16 rounded object-cover"
                    alt={download.game.title}
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className={cn('text-sm mb-1 truncate')}>
                      {download.game.title}
                    </CardTitle>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {download.status === 'downloading' && 'Downloading...'}
                          {download.status === 'completed' && 'Completed'}
                          {download.status === 'error' && 'Error'}
                        </span>
                        <span>
                          {formatSize(download.downloadedBytes)} /
                          {download.totalBytes > 0 ? ` ${formatSize(download.totalBytes)}` : ' ---'}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            download.status === 'completed'
                              ? 'bg-green-500'
                              : download.status === 'error'
                                ? 'bg-red-500'
                                : 'bg-primary'
                          )}
                          style={{ width: `${download.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {download.progress.toFixed(1)}%
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        {download.parts.map((part) => (
                          <div key={part.id} className="flex justify-between">
                            <span>{part.label}</span>
                            <span>
                              {formatSize(part.downloadedBytes)} /
                              {part.totalBytes > 0 ? ` ${formatSize(part.totalBytes)}` : ' ---'}
                              {'  '}
                              {part.progress.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveDownload(download.id)}
                    aria-label="Remove"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default Downloads
