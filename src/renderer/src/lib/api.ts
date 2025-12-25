import { Game } from '@renderer/types'
import axios from 'axios'
import logger from './logger'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://quantum.lwproducoes.com/api/v1'
})

interface CacheEntry {
  data: Game[]
  timestamp: number
}

const CACHE_KEY = 'games_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

async function getCachedGames(): Promise<Game[] | null> {
  try {
    const cached = await window.api.getCache(CACHE_KEY)
    if (!cached) return null

    const entry: CacheEntry = cached
    const now = Date.now()

    // Check if cache expired (24 hours)
    if (now - entry.timestamp > CACHE_DURATION) {
      await window.api.deleteCache(CACHE_KEY)
      return null
    }

    return entry.data
  } catch (error) {
    logger.error('Error reading cache:', error)
    return null
  }
}

async function setCachedGames(data: Game[]): Promise<void> {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    }
    await window.api.setCache(CACHE_KEY, entry)
  } catch (error) {
    logger.error('Error saving cache:', error)
  }
}

export async function fetchGames(searchTerm?: string, useCache = false) {
  // If useCache is true and there is no searchTerm, try to return from cache
  if (useCache && !searchTerm) {
    const cached = await getCachedGames()
    if (cached) {
      return { data: cached }
    }
  }

  const response = await api.get<Game[]>('/games', { params: { query: searchTerm } })

  // Save to cache only when there is no searchTerm (full list)
  if (!searchTerm) {
    await setCachedGames(response.data)
  }

  return response
}

export function selectDownloadFolder(): Promise<string | null> {
  return window.api.selectDirectory()
}

export async function getDownloadFolder(): Promise<string | null> {
  const val = await window.api.getSetting('downloadFolder')
  return typeof val === 'string' ? val : null
}

export function setDownloadFolder(path: string): Promise<boolean> {
  return window.api.setSetting('downloadFolder', path)
}

export default api
