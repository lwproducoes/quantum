import { DownloadItem, DownloadPart } from '@renderer/types'

const updatePartProgress = (
  part: DownloadPart,
  url: string,
  data: { progress: number; downloadedSize: number; totalSize: number }
): DownloadPart => {
  if (part.url !== url) return part

  return {
    ...part,
    progress: data.progress,
    downloadedBytes: data.downloadedSize,
    totalBytes: data.totalSize || part.totalBytes,
    status: 'downloading' as const
  }
}
const updatePartComplete = (part: DownloadPart, url: string): DownloadPart => {
  if (part.url !== url) return part

  return { ...part, status: 'completed' as const, progress: 100 }
}
export const updatePartError = (part: DownloadPart, url: string): DownloadPart => {
  if (part.url !== url) return part

  return { ...part, status: 'error' as const }
}
const updatePartCancelled = (part: DownloadPart, url: string): DownloadPart => {
  if (part.url !== url) return part

  return { ...part, status: 'canceled' as const, progress: 0, downloadedBytes: 0 }
}
const updatePartStarted = (part: DownloadPart, url: string): DownloadPart => {
  if (part.url !== url) return part

  return { ...part, status: 'downloading' as const }
}
const calculateTotalProgress = (
  parts: DownloadPart[]
): { totalBytes: number; downloadedBytes: number; progress: number } => {
  const totalBytes = parts.reduce((sum, p) => sum + Math.max(p.totalBytes, 0), 0)
  const downloadedBytes = parts.reduce((sum, p) => sum + p.downloadedBytes, 0)
  const progress =
    totalBytes > 0
      ? Math.min((downloadedBytes / totalBytes) * 100, 100)
      : parts.reduce((sum, p) => sum + p.progress, 0) / parts.length

  return { totalBytes, downloadedBytes, progress }
}
export const updateDownloadProgress = (
  d: DownloadItem,
  url: string,
  data: { progress: number; downloadedSize: number; totalSize: number }
) => {
  const part = d.parts.find((p) => p.url === url)
  if (!part) return d

  const updatedParts = d.parts.map((p) => updatePartProgress(p, url, data))
  const { totalBytes, downloadedBytes, progress } = calculateTotalProgress(updatedParts)

  return {
    ...d,
    parts: updatedParts,
    totalBytes,
    downloadedBytes,
    progress,
    status: 'downloading' as const
  }
}
export const updateDownloadComplete = (d: DownloadItem, url: string) => {
  const part = d.parts.find((p) => p.url === url)
  if (!part) return d

  const updatedParts = d.parts.map((p) => updatePartComplete(p, url))
  const allCompleted = updatedParts.every((p) => p.status === 'completed')
  const { totalBytes, downloadedBytes } = calculateTotalProgress(updatedParts)

  return {
    ...d,
    parts: updatedParts,
    status: allCompleted ? ('completed' as const) : ('downloading' as const),
    progress: allCompleted ? 100 : d.progress,
    totalBytes,
    downloadedBytes
  }
}
export const updateDownloadError = (d: DownloadItem, url: string) => {
  const part = d.parts.find((p) => p.url === url)
  if (!part) return d

  const updatedParts = d.parts.map((p) => updatePartError(p, url))

  return {
    ...d,
    parts: updatedParts,
    status: 'error' as const
  }
}
export const updateDownloadCancelled = (d: DownloadItem, url: string) => {
  const part = d.parts.find((p) => p.url === url)
  if (!part) return d

  const updatedParts = d.parts.map((p) => updatePartCancelled(p, url))
  const allCanceled = updatedParts.every((p) => p.status === 'canceled')

  return {
    ...d,
    parts: updatedParts,
    status: allCanceled ? ('canceled' as const) : d.status,
    progress: allCanceled ? 0 : d.progress,
    downloadedBytes: allCanceled ? 0 : d.downloadedBytes,
    totalBytes: allCanceled ? 0 : d.totalBytes
  }
}
export const updateDownloadStarted = (d: DownloadItem, url: string) => {
  const part = d.parts.find((p) => p.url === url)
  if (!part) return d

  const updatedParts = d.parts.map((p) => updatePartStarted(p, url))
  return { ...d, parts: updatedParts, status: 'downloading' as const }
}
