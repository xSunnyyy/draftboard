import { useEffect, useRef, useState } from 'react'
import * as sleeper from '../lib/sleeper'
import { teamNamesFromDraftOrder } from '../lib/resolveSleeperDraft'

/**
 * Re-resolves real Sleeper team names once a league's `draft_order` becomes
 * available. The initial connect-time resolve (see resolveSleeperDraft) can
 * happen before Sleeper has assigned draft order — many leagues randomize it
 * right as the draft goes live — in which case names fall back to generic
 * "Team N" placeholders that would otherwise never get corrected. Fetches
 * once per league, the same way useLeagueHistory does, since draftOrder is a
 * freshly-parsed object every poll even when its content is unchanged.
 */
export function useSleeperTeamNames(
  leagueId: string | null,
  draftOrder: Record<string, number> | null,
  teamCount: number,
): string[] | null {
  const [names, setNames] = useState<string[] | null>(null)
  const fetchedForLeagueRef = useRef<string | null>(null)

  useEffect(() => {
    if (!leagueId || !draftOrder) return
    if (fetchedForLeagueRef.current === leagueId) return
    fetchedForLeagueRef.current = leagueId
    let cancelled = false
    sleeper
      .getLeagueUsers(leagueId)
      .then((users) => {
        if (cancelled) return
        setNames(teamNamesFromDraftOrder(draftOrder, users, teamCount))
      })
      .catch(() => {
        // Real names are a nice-to-have; keep whatever the board already has.
      })
    return () => {
      cancelled = true
    }
  }, [leagueId, draftOrder, teamCount])

  return names
}
