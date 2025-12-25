import { Game } from '@renderer/types'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://quantum.lwproducoes.com/api/v1'
})

interface CacheEntry {
  data: Game[]
  timestamp: number
}

const CACHE_KEY = 'games_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas em milissegundos

async function getCachedGames(): Promise<Game[] | null> {
  try {
    const cached = await window.api.getCache(CACHE_KEY)
    if (!cached) return null

    const entry: CacheEntry = cached
    const now = Date.now()

    // Verifica se o cache expirou (24 horas)
    if (now - entry.timestamp > CACHE_DURATION) {
      await window.api.deleteCache(CACHE_KEY)
      return null
    }

    return entry.data
  } catch (error) {
    console.error('Erro ao ler cache:', error)
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
    console.error('Erro ao salvar cache:', error)
  }
}

export async function fetchGames(searchTerm?: string, useCache = false) {
  // Se useCache for true e não houver searchTerm, tenta retornar do cache
  if (useCache && !searchTerm) {
    const cached = await getCachedGames()
    if (cached) {
      return { data: cached }
    }
  }

  const response = await api.get<Game[]>('/games', { params: { query: searchTerm } })

  // Salva no cache apenas quando não há searchTerm (lista completa)
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
