import logger from '@renderer/lib/logger'
import { DownloadItem, DownloadPartKind, Provider } from '@renderer/types'
import { Dispatch, SetStateAction } from 'react'
import {
  updateDownloadCancelled,
  updateDownloadComplete,
  updateDownloadError,
  updateDownloadProgress,
  updateDownloadStarted
} from './updatePartError'

function makeHandleStarted(setDownloads: Dispatch<SetStateAction<DownloadItem[]>>) {
  return (data: { url: string; provider: Provider; kind?: DownloadPartKind }) => {
    setDownloads((prev) => prev.map((d) => updateDownloadStarted(d, data.url)))
  }
}

function makeHandleCancelled(setDownloads: Dispatch<SetStateAction<DownloadItem[]>>) {
  return (data: { url: string; kind?: DownloadPartKind }) => {
    setDownloads((prev) => prev.map((d) => updateDownloadCancelled(d, data.url)))
  }
}

function makeHandleError(setDownloads: Dispatch<SetStateAction<DownloadItem[]>>) {
  return (data: { url: string; error: string; kind?: DownloadPartKind }) => {
    logger.error('Download error:', data.error)
    setDownloads((prev) => prev.map((d) => updateDownloadError(d, data.url)))
  }
}

function makeHandleComplete(setDownloads: Dispatch<SetStateAction<DownloadItem[]>>) {
  return (data: { url: string; filename: string; filePath: string; kind?: DownloadPartKind }) => {
    setDownloads((prev) => prev.map((d) => updateDownloadComplete(d, data.url)))
  }
}

function makeHandleProgress(setDownloads: Dispatch<SetStateAction<DownloadItem[]>>) {
  return (data: {
    url: string
    progress: number
    downloadedSize: number
    totalSize: number
    filename: string
    kind?: DownloadPartKind
  }) => {
    setDownloads((prev) => prev.map((d) => updateDownloadProgress(d, data.url, data)))
  }
}

export {
  makeHandleCancelled,
  makeHandleComplete,
  makeHandleError,
  makeHandleProgress,
  makeHandleStarted
}
