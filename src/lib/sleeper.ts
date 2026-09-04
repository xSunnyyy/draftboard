import type {
  SleeperDraft,
  SleeperDraftPick,
  SleeperLeague,
  SleeperPlayer,
  SleeperUser,
} from '../types'

const BASE = 'https://api.sleeper.app/v1'

export class SleeperError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SleeperError'
  }
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`)
  } catch {
    throw new SleeperError('Could not reach Sleeper. Check your connection.')
  }
  if (res.status === 404) {
    throw new SleeperError('Not found on Sleeper.')
  }
  if (!res.ok) {
    throw new SleeperError(`Sleeper request failed (${res.status}).`)
  }
  return (await res.json()) as T
}

export function getLeague(leagueId: string): Promise<SleeperLeague> {
  return getJson<SleeperLeague>(`/league/${leagueId}`)
}

export function getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
  return getJson<SleeperDraft[]>(`/league/${leagueId}/drafts`)
}

export function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  return getJson<SleeperUser[]>(`/league/${leagueId}/users`)
}

export function getDraft(draftId: string): Promise<SleeperDraft> {
  return getJson<SleeperDraft>(`/draft/${draftId}`)
}

export function getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  return getJson<SleeperDraftPick[]>(`/draft/${draftId}/picks`)
}

export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  const res = await fetch(`${BASE}/players/nfl`)
  if (!res.ok) throw new SleeperError(`Could not load Sleeper player data (${res.status}).`)
  return (await res.json()) as Record<string, SleeperPlayer>
}

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF'])

export function isFantasyRelevant(p: SleeperPlayer): boolean {
  if (!p.position || !FANTASY_POSITIONS.has(p.position)) return false
  if (p.position !== 'DEF' && p.search_rank == null) return false
  return true
}
