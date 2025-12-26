import { createWriteStream, WriteStream } from 'node:fs'
import { mkdir, rename, unlink } from 'node:fs/promises'
import { IncomingMessage } from 'node:http'
import { get } from 'node:https'
import { join } from 'node:path/posix'
import { activeDownloads, cancelledDownloads } from '.'
import { SevenZip } from './services/7zip'
import { logger } from './services/logger'
import { DownloadKind, Provider } from './types'

async function handleFileExtraction(
  filePath: string,
  extractPath: string,
  filename: string,
  kind: DownloadKind,
  webContents: Electron.WebContents,
  downloadUrl: string
): Promise<void> {
  if (!filename.endsWith('.nsp') && !filename.endsWith('.xci') && !filename.endsWith('.nsz')) {
    await SevenZip.extractFile({ filePath, outputPath: extractPath }, (progress) => {
      const percent = typeof progress?.percent === 'number' ? progress.percent : 0
      webContents.send('download:extract-progress', {
        url: downloadUrl,
        progress: percent,
        kind
      })
    })
    try {
      await unlink(filePath)
    } catch (error) {
      logger.warn('Failed to delete archive after extraction:', error)
    }
  } else {
    try {
      if (kind === 'dlc' || kind === 'update') {
        const destPath = extractPath
        await mkdir(destPath, { recursive: true })
        const destFilePath = join(destPath, filename)
        await rename(filePath, destFilePath)
      }
    } catch (error) {
      logger.warn('Failed to handle NSP/NSZ file after download:', error)
    }
  }
}

function handleDownloadProgress(
  chunk: Buffer,
  downloadedSize: number,
  totalSize: number,
  webContents: Electron.WebContents,
  downloadUrl: string,
  filename: string,
  kind: DownloadKind
): number {
  downloadedSize += chunk.length
  const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0
  webContents.send('download:progress', {
    url: downloadUrl,
    progress,
    downloadedSize,
    totalSize,
    filename,
    kind
  })
  return downloadedSize
}

function setupResponseHandlers(ctx: {
  response: IncomingMessage
  fileStream: WriteStream
  downloadKey: string
  filePath: string
  extractPath: string
  filename: string
  kind: DownloadKind
  webContents: Electron.WebContents
  downloadUrl: string
  resolve: (value: { success: boolean; filePath: string }) => void
  reject: (reason?: any) => void
}): void {
  const {
    response,
    fileStream,
    downloadKey,
    filePath,
    extractPath,
    filename,
    kind,
    webContents,
    downloadUrl,
    resolve,
    reject
  } = ctx
  const totalSize = Number.parseInt(response.headers['content-length'] || '0', 10)
  let downloadedSize = 0

  const cleanup = () => {
    activeDownloads.delete(ctx.downloadKey)
    cancelledDownloads.delete(ctx.downloadKey)
  }

  response.on('data', (chunk) => {
    downloadedSize = handleDownloadProgress(
      chunk,
      downloadedSize,
      totalSize,
      webContents,
      downloadUrl,
      filename,
      kind
    )
  })

  response.pipe(fileStream)

  fileStream.on('finish', async () => {
    fileStream.close()
    cleanup()
    try {
      await handleFileExtraction(filePath, extractPath, filename, kind, webContents, downloadUrl)

      webContents.send('download:complete', {
        url: downloadUrl,
        filename,
        filePath,
        extractedTo: extractPath,
        kind
      })
      resolve({ success: true, filePath })
    } catch (error: any) {
      logger.error('Extraction failed:', error)
      cleanup()
      webContents.send('download:error', {
        url: downloadUrl,
        error: error?.message || 'Extraction failed',
        kind
      })
      reject(error)
    }
  })

  fileStream.on('error', (err) => {
    fileStream.close()
    const isCancelled = cancelledDownloads.has(downloadKey)
    cleanup()
    if (isCancelled) {
      unlink(filePath).catch(() => {})
      webContents.send('download:cancelled', { url: downloadUrl, kind })
      resolve({ success: false, filePath })
      return
    }
    webContents.send('download:error', { url: downloadUrl, error: err.message, kind })
    reject(err)
  })
}

export async function performDownload(ctx: {
  webContents: Electron.WebContents
  realDownloadUrl: string
  downloadUrl: string
  filename: string
  filePath: string
  extractPath: string
  kind: DownloadKind
  provider: Provider
  downloadKey: string
}): Promise<{ success: boolean; filePath: string }> {
  const {
    webContents,
    realDownloadUrl,
    downloadUrl,
    filename,
    filePath,
    extractPath,
    kind,
    provider,
    downloadKey
  } = ctx

  return new Promise<{ success: boolean; filePath: string }>((resolve, reject) => {
    const request = get(
      realDownloadUrl,
      {
        ...(provider === 'nswpedia'
          ? {
              headers: {
                referer: 'https://nswpedia.com/'
              }
            }
          : {})
      },
      (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`))
          return
        }

        const fileStream = createWriteStream(filePath)
        activeDownloads.set(downloadKey, { request, fileStream })

        setupResponseHandlers({
          response,
          fileStream,
          downloadKey,
          filePath,
          extractPath,
          filename,
          kind,
          webContents,
          downloadUrl,
          resolve,
          reject
        })
      }
    )

    request.on('error', (err) => {
      const isCancelled = cancelledDownloads.has(downloadKey)
      activeDownloads.delete(downloadKey)
      if (isCancelled) {
        unlink(filePath).catch(() => {})
        webContents.send('download:cancelled', { url: downloadUrl, kind })
        resolve({ success: false, filePath })
        return
      }
      webContents.send('download:error', { url: downloadUrl, error: err.message, kind })
      reject(err)
    })
  })
}
