import { rosterShapeByTeam, teamLabel } from './draftEngine'
import type { Draft, DraftPick, SleeperPlayer } from '../types'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export interface RecapPick {
  pick: DraftPick
  rank: number
  /** overallPick - rank: positive means the player fell (a steal), negative means they went early (a reach). */
  valueDelta: number
}

export interface TimedPick {
  pick: DraftPick
  seconds: number
}

export interface PositionalStandout {
  position: string
  best: RecapPick
}

export interface FirstAtPosition {
  position: string
  pick: DraftPick
}

export interface TeamReport {
  slot: number
  teamName: string
  pickCount: number
  avgValue: number
  grade: string
  best: RecapPick | null
  worst: RecapPick | null
  powerScore: number
}

export interface PowerRanking extends TeamReport {
  rank: number
  tier: 'Contender' | 'Bubble team' | 'Rebuilding'
}

export interface PositionHoarder {
  teamName: string
  position: string
  count: number
}

export interface TeamValueAward {
  slot: number
  teamName: string
  avgValue: number
}

export interface DraftRecapData {
  totalPicks: number
  durationLabel: string | null
  avgPickSeconds: number | null
  fastestPick: TimedPick | null
  slowestPick: TimedPick | null
  biggestSteal: RecapPick | null
  biggestReach: RecapPick | null
  bestValueTeam: TeamValueAward | null
  worstValueTeam: TeamValueAward | null
  positionalStandouts: PositionalStandout[]
  firstByPosition: FirstAtPosition[]
  teamReports: TeamReport[]
  powerRankings: PowerRanking[]
  positionHoarder: PositionHoarder | null
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatSecondsShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function letterGrade(avg: number): string {
  if (avg >= 15) return 'A+'
  if (avg >= 9) return 'A'
  if (avg >= 4) return 'B+'
  if (avg >= 1) return 'B'
  if (avg >= -1) return 'C'
  if (avg >= -4) return 'C-'
  if (avg >= -9) return 'D'
  return 'F'
}

/** A rough "how good is this pick for a starting lineup" curve — rewards top-of-draft
 *  talent while flattening out for players who'd never start anyway. */
function starterPoints(rank: number): number {
  return Math.max(0, 260 - rank)
}

/** Estimates a team's roster strength for the "way-too-early power rankings": fills a
 *  standard starting lineup (1 QB, 2 RB, 2 WR, 1 TE, 1 flex, 1 K, 1 DEF) from a team's
 *  best-ranked players at each spot and sums their value — bench depth at a position a
 *  team already has plenty of shouldn't inflate a projected finish. */
function computeTeamPower(picks: RecapPick[]): number {
  const byPos = new Map<string, RecapPick[]>()
  for (const rp of picks) {
    const pos = rp.pick.position || 'UNK'
    if (!byPos.has(pos)) byPos.set(pos, [])
    byPos.get(pos)!.push(rp)
  }
  for (const list of byPos.values()) list.sort((a, b) => a.rank - b.rank)

  const used = new Set<RecapPick>()
  let score = 0
  function takeBest(pos: string, count: number) {
    const list = byPos.get(pos) || []
    let taken = 0
    for (const rp of list) {
      if (taken >= count) break
      if (used.has(rp)) continue
      used.add(rp)
      score += starterPoints(rp.rank)
      taken++
    }
  }
  takeBest('QB', 1)
  takeBest('RB', 2)
  takeBest('WR', 2)
  takeBest('TE', 1)
  const flexPool = (['RB', 'WR', 'TE'] as const)
    .flatMap((pos) => byPos.get(pos) || [])
    .filter((rp) => !used.has(rp))
    .sort((a, b) => a.rank - b.rank)
  if (flexPool[0]) {
    used.add(flexPool[0])
    score += starterPoints(flexPool[0].rank)
  }
  takeBest('K', 1)
  takeBest('DEF', 1)
  return Math.round(score)
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

  const bySlot = new Map<number, RecapPick[]>()
  for (const v of values) {
    if (!bySlot.has(v.pick.slot)) bySlot.set(v.pick.slot, [])
    bySlot.get(v.pick.slot)!.push(v)
  }

  const teamReports: TeamReport[] = Array.from(bySlot.entries()).map(([slot, picks]) => {
    const avgValue = picks.reduce((a, b) => a + b.valueDelta, 0) / picks.length
    const best = picks.reduce((a, b) => (b.valueDelta > a.valueDelta ? b : a))
    const worst = picks.reduce((a, b) => (b.valueDelta < a.valueDelta ? b : a))
    return {
      slot,
      teamName: teamLabel(draft, slot),
      pickCount: picks.length,
      avgValue,
      grade: letterGrade(avgValue),
      best,
      worst,
      powerScore: computeTeamPower(picks),
    }
  })

  const bestValueTeam = teamReports.length
    ? teamReports.reduce((a, b) => (b.avgValue > a.avgValue ? b : a))
    : null
  const worstValueTeam = teamReports.length
    ? teamReports.reduce((a, b) => (b.avgValue < a.avgValue ? b : a))
    : null

  const teamCount = teamReports.length
  const powerRankings: PowerRanking[] = [...teamReports]
    .sort((a, b) => b.powerScore - a.powerScore)
    .map((team, i) => ({
      ...team,
      rank: i + 1,
      tier:
        teamCount <= 2 || i < Math.ceil(teamCount / 3)
          ? 'Contender'
          : i < Math.ceil((2 * teamCount) / 3)
            ? 'Bubble team'
            : 'Rebuilding',
    }))

  const positionalStandouts: PositionalStandout[] = POSITIONS.map((position) => {
    const list = values.filter((v) => v.pick.position === position)
    if (!list.length) return null
    const best = list.reduce((a, b) => (b.valueDelta > a.valueDelta ? b : a))
    return { position, best }
  }).filter((x): x is PositionalStandout => x !== null)

  const firstByPosition: FirstAtPosition[] = POSITIONS.map((position) => {
    const picksAtPos = filled.filter((p) => p.position === position).sort((a, b) => a.overallPick - b.overallPick)
    return picksAtPos[0] ? { position, pick: picksAtPos[0] } : null
  }).filter((x): x is FirstAtPosition => x !== null)

  let positionHoarder: PositionHoarder | null = null
  for (const row of rosterShapeByTeam(draft)) {
    for (const [position, count] of Object.entries(row.counts)) {
      if (count >= 3 && (!positionHoarder || count > positionHoarder.count)) {
        positionHoarder = { teamName: row.teamName, position, count }
      }
    }
  }

  const sortedFilled = [...filled].sort((a, b) => a.overallPick - b.overallPick)
  const deltas: TimedPick[] = []
  for (let i = 1; i < sortedFilled.length; i++) {
    const prev = sortedFilled[i - 1].pickedAt
    const cur = sortedFilled[i].pickedAt
    if (prev == null || cur == null) continue
    const seconds = Math.round((cur - prev) / 1000)
    if (seconds <= 0) continue
    deltas.push({ pick: sortedFilled[i], seconds })
  }
  // Exclude long pauses (someone stepped away, an overnight break) from timing awards —
  // those reflect a break in the draft, not a team actually deliberating on the clock.
  const reasonableDeltas = deltas.filter((d) => d.seconds <= 1800)
  let avgPickSeconds: number | null = null
  let fastestPick: TimedPick | null = null
  let slowestPick: TimedPick | null = null
  if (reasonableDeltas.length > 0) {
    avgPickSeconds = Math.round(reasonableDeltas.reduce((a, b) => a + b.seconds, 0) / reasonableDeltas.length)
    fastestPick = reasonableDeltas.reduce((a, b) => (b.seconds < a.seconds ? b : a))
    slowestPick = reasonableDeltas.reduce((a, b) => (b.seconds > a.seconds ? b : a))
  }

  const timestamps = filled.map((p) => p.pickedAt).filter((t): t is number => t != null)
  let durationLabel: string | null = null
  if (timestamps.length >= 2) {
    const span = Math.max(...timestamps) - Math.min(...timestamps)
    if (span > 60_000) durationLabel = formatDuration(span)
  }

  return {
    totalPicks: filled.length,
    durationLabel,
    avgPickSeconds,
    fastestPick,
    slowestPick,
    biggestSteal,
    biggestReach,
    bestValueTeam: bestValueTeam ? { slot: bestValueTeam.slot, teamName: bestValueTeam.teamName, avgValue: bestValueTeam.avgValue } : null,
    worstValueTeam: worstValueTeam ? { slot: worstValueTeam.slot, teamName: worstValueTeam.teamName, avgValue: worstValueTeam.avgValue } : null,
    positionalStandouts,
    firstByPosition,
    teamReports,
    powerRankings,
    positionHoarder,
  }
}
