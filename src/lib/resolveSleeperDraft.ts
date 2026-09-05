import * as sleeper from './sleeper'
import type { DraftSettings } from '../types'

export interface ResolvedSleeperDraft {
  draftId: string
  leagueId: string | null
  name: string
  settings: DraftSettings
}

/**
 * Given a Sleeper league ID or draft ID (users usually only know the league
 * ID), resolves the actual draft, its league, team names, and draft
 * settings. Shared by the manual setup flow and the voice-companion mode.
 */
export async function resolveSleeperDraft(input: string, base: DraftSettings): Promise<ResolvedSleeperDraft> {
  let draftId = input
  let leagueId: string | null = null
  let leagueName: string | null = null

  // Try treating the input as a league ID first (most users know their league ID).
  try {
    const league = await sleeper.getLeague(input)
    leagueId = league.league_id
    leagueName = league.name
    if (league.draft_id) {
      draftId = league.draft_id
    } else {
      const drafts = await sleeper.getLeagueDrafts(input)
      if (drafts.length === 0) throw new sleeper.SleeperError('This league has no drafts yet.')
      draftId = drafts[0].draft_id
    }
  } catch {
    // Not a valid league ID; fall through and try it as a draft ID directly.
  }

  const draft = await sleeper.getDraft(draftId)
  leagueId = leagueId ?? draft.league_id

  let teamNames = base.teamNames
  if (leagueId) {
    try {
      const users = await sleeper.getLeagueUsers(leagueId)
      const order = draft.draft_order
      if (order) {
        const bySlot = new Map<number, string>()
        for (const [userId, slot] of Object.entries(order)) {
          const user = users.find((u) => u.user_id === userId)
          bySlot.set(slot, user?.metadata?.team_name || user?.display_name || `Team ${slot}`)
        }
        teamNames = Array.from({ length: draft.settings.teams }, (_, i) => bySlot.get(i + 1) || `Team ${i + 1}`)
      }
    } catch {
      // Team names are a nice-to-have; keep defaults if this fails.
    }
  }

  const settings: DraftSettings = {
    ...base,
    teamCount: draft.settings.teams,
    teamNames,
    rounds: draft.settings.rounds,
    timerSeconds: draft.settings.pick_timer || base.timerSeconds,
    season: draft.season,
  }

  return {
    draftId,
    leagueId,
    name: leagueName || draft.metadata?.name || `Sleeper draft ${draftId}`,
    settings,
  }
}
