import type { Draft, DraftPick, DraftSettings } from '../types'

export function slotForPick(round: number, teamCount: number, draftType: DraftSettings['draftType']): number[] {
  const order = Array.from({ length: teamCount }, (_, i) => i + 1)
  if (draftType === 'snake' && round % 2 === 0) return [...order].reverse()
  return order
}

export function buildEmptyPicks(settings: DraftSettings): DraftPick[] {
  const picks: DraftPick[] = []
  let overall = 1
  for (let round = 1; round <= settings.rounds; round++) {
    const order = slotForPick(round, settings.teamCount, settings.draftType)
    for (let pickInRound = 1; pickInRound <= settings.teamCount; pickInRound++) {
      picks.push({
        overallPick: overall,
        round,
        pickInRound,
        slot: order[pickInRound - 1],
        playerId: null,
        playerName: null,
        position: null,
        nflTeam: null,
        pickedAt: null,
        isManualEdit: false,
      })
      overall++
    }
  }
  return picks
}

export function currentPickIndex(picks: DraftPick[]): number {
  const idx = picks.findIndex((p) => p.playerId === null)
  return idx === -1 ? picks.length : idx
}

export function isDraftComplete(picks: DraftPick[]): boolean {
  return picks.length > 0 && picks.every((p) => p.playerId !== null)
}

export function teamLabel(draft: Draft, slot: number): string {
  return draft.settings.teamNames[slot - 1] || `Team ${slot}`
}

export interface RosterShapeRow {
  slot: number
  teamName: string
  counts: Record<string, number>
  total: number
}

export function rosterShapeByTeam(draft: Draft): RosterShapeRow[] {
  const rows: RosterShapeRow[] = Array.from({ length: draft.settings.teamCount }, (_, i) => ({
    slot: i + 1,
    teamName: teamLabel(draft, i + 1),
    counts: {},
    total: 0,
  }))
  for (const pick of draft.picks) {
    if (!pick.playerId) continue
    const row = rows[pick.slot - 1]
    const pos = pick.position || 'UNK'
    row.counts[pos] = (row.counts[pos] || 0) + 1
    row.total += 1
  }
  return rows
}

export function draftToCsv(draft: Draft): string {
  const header = ['Overall', 'Round', 'Pick', 'Team', 'Player', 'Position', 'NFL Team']
  const lines = [header.join(',')]
  for (const pick of draft.picks) {
    if (!pick.playerId) continue
    const row = [
      pick.overallPick,
      pick.round,
      pick.pickInRound,
      csvField(teamLabel(draft, pick.slot)),
      csvField(pick.playerName || ''),
      pick.position || '',
      pick.nflTeam || '',
    ]
    lines.push(row.join(','))
  }
  return lines.join('\n')
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
