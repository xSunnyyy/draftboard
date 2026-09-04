import { teamLabel } from './draftEngine'
import type { Draft, DraftPick, SleeperPlayer } from '../types'

export interface RecapPick {
  pick: DraftPick
  rank: number
  /** overallPick - rank: positive means the player fell (a steal), negative means they went early (a reach). */
  valueDelta: number
}

export interface TeamValueAward {
  slot: number
  teamName: string
  avgValue: number
}

export interface DraftRecapData {
  totalPicks: number
  durationLabel: string | null
  biggestSteal: RecapPick | null
  biggestReach: RecapPick | null
  bestValueTeam: TeamValueAward | null
  worstValueTeam: TeamValueAward | null
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function buildDraftRecap(draft: Draft, players: Record<string, SleeperPlayer>): DraftRecapData {
  const filled = draft.picks.filter((p) => p.playerId)

  const values: RecapPick[] = []
  for (const pick of filled) {
    const player = players[pick.playerId!]
    const rank = player?.search_rank
    if (rank == null) continue
    values.push({ pick, rank, valueDelta: pick.overallPick - rank })
  }

  const biggestSteal = values.length ? values.reduce((a, b) => (b.valueDelta > a.valueDelta ? b : a)) : null
  const biggestReach = values.length ? values.reduce((a, b) => (b.valueDelta < a.valueDelta ? b : a)) : null

  const bySlot = new Map<number, number[]>()
  for (const v of values) {
    if (!bySlot.has(v.pick.slot)) bySlot.set(v.pick.slot, [])
    bySlot.get(v.pick.slot)!.push(v.valueDelta)
  }
  const teamAverages: TeamValueAward[] = Array.from(bySlot.entries()).map(([slot, deltas]) => ({
    slot,
    teamName: teamLabel(draft, slot),
    avgValue: deltas.reduce((a, b) => a + b, 0) / deltas.length,
  }))
  const bestValueTeam = teamAverages.length ? teamAverages.reduce((a, b) => (b.avgValue > a.avgValue ? b : a)) : null
  const worstValueTeam = teamAverages.length ? teamAverages.reduce((a, b) => (b.avgValue < a.avgValue ? b : a)) : null

  const timestamps = filled.map((p) => p.pickedAt).filter((t): t is number => t != null)
  let durationLabel: string | null = null
  if (timestamps.length >= 2) {
    const span = Math.max(...timestamps) - Math.min(...timestamps)
    if (span > 60_000) durationLabel = formatDuration(span)
  }

  return { totalPicks: filled.length, durationLabel, biggestSteal, biggestReach, bestValueTeam, worstValueTeam }
}
