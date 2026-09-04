import { useCallback, useEffect, useState } from 'react'
import { getAllPlayers, isFantasyRelevant } from '../lib/sleeper'
import type { SleeperPlayer } from '../types'

const CACHE_KEY = 'draftboard.players.v1'
const CACHE_TS_KEY = 'draftboard.players.v1.ts'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface PlayerPoolState {
  players: Record<string, SleeperPlayer>
  loading: boolean
  error: string | null
  updatedAt: number | null
  refresh: () => Promise<void>
}

function readCache(): { players: Record<string, SleeperPlayer>; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const ts = localStorage.getItem(CACHE_TS_KEY)
    if (!raw || !ts) return null
    return { players: JSON.parse(raw), ts: Number(ts) }
  } catch {
    return null
  }
}

function writeCache(players: Record<string, SleeperPlayer>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(players))
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()))
  } catch {
    // storage full or unavailable; caching is a best-effort optimization
  }
}

export function usePlayers(): PlayerPoolState {
  const [players, setPlayers] = useState<Record<string, SleeperPlayer>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  const fetchFresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await getAllPlayers()
      const filtered: Record<string, SleeperPlayer> = {}
      for (const [id, p] of Object.entries(all)) {
        if (isFantasyRelevant(p)) filtered[id] = p
      }
      writeCache(filtered)
      setPlayers(filtered)
      setUpdatedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Sleeper player data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cached = readCache()
    if (cached) {
      setPlayers(cached.players)
      setUpdatedAt(cached.ts)
      if (Date.now() - cached.ts < CACHE_TTL_MS) return
    }
    void fetchFresh()
  }, [fetchFresh])

  return { players, loading, error, updatedAt, refresh: fetchFresh }
}
