import { useEffect, useState } from 'react'
import * as sleeper from '../lib/sleeper'
import type { TeamHistory } from '../lib/roasts'
import type { SleeperDraftPick, SleeperPlayer } from '../types'

export type { TeamHistory } from '../lib/roasts'

/**
 * Best-effort lookup of each drafter's prior-season record, their first pick
 * from last year's draft, and their Sleeper avatar — pulled by following a
 * league's `previous_league_id` chain back one season. Any failure here is
 * silently swallowed since this is flavor for commentary, not core to the
 * draft itself (a first-year league has no previous season at all).
 */
export function useLeagueHistory(
  leagueId: string | null,
  draftOrder: Record<string, number> | null,
  players: Record<string, SleeperPlayer>,
): Map<number, TeamHistory> {
  const [history, setHistory] = useState<Map<number, TeamHistory>>(new Map())

  useEffect(() => {
    if (!leagueId || !draftOrder) return
    let cancelled = false

    async function run() {
      const map = new Map<number, TeamHistory>()
      try {
        const [league, users] = await Promise.all([
          sleeper.getLeague(leagueId!),
          sleeper.getLeagueUsers(leagueId!),
        ])
        const usersById = new Map(users.map((u) => [u.user_id, u]))

        for (const [userId, slot] of Object.entries(draftOrder!)) {
          const user = usersById.get(userId)
          map.set(slot, {
            record: null,
            lastYearFirstPick: null,
            avatarUrl: user?.avatar ? `https://sleepercdn.com/avatars/${user.avatar}` : null,
          })
        }

        const prevLeagueId = league.previous_league_id
        if (prevLeagueId) {
          const [rosters, prevDrafts] = await Promise.all([
            sleeper.getLeagueRosters(prevLeagueId),
            sleeper.getLeagueDrafts(prevLeagueId),
          ])
          const rostersByOwner = new Map(rosters.map((r) => [r.owner_id, r]))
          const prevDraft = prevDrafts.find((d) => d.status === 'complete') ?? prevDrafts[0]

          const picksByUser = new Map<string, SleeperDraftPick[]>()
          if (prevDraft) {
            const picks = await sleeper.getDraftPicks(prevDraft.draft_id)
            for (const p of picks) {
              if (!picksByUser.has(p.picked_by)) picksByUser.set(p.picked_by, [])
              picksByUser.get(p.picked_by)!.push(p)
            }
          }

          for (const [userId, slot] of Object.entries(draftOrder!)) {
            const roster = rostersByOwner.get(userId)
            const record = roster?.settings
              ? {
                  wins: roster.settings.wins ?? 0,
                  losses: roster.settings.losses ?? 0,
                  ties: roster.settings.ties ?? 0,
                }
              : null

            const userPicks = (picksByUser.get(userId) ?? []).sort((a, b) => a.pick_no - b.pick_no)
            const firstPick = userPicks[0]
            let lastYearFirstPick: TeamHistory['lastYearFirstPick'] = null
            if (firstPick) {
              const player = players[firstPick.player_id]
              const name = player
                ? `${player.first_name} ${player.last_name}`.trim()
                : firstPick.metadata?.first_name || firstPick.metadata?.last_name
                  ? `${firstPick.metadata?.first_name ?? ''} ${firstPick.metadata?.last_name ?? ''}`.trim()
                  : null
              if (name) {
                lastYearFirstPick = { playerName: name, position: player?.position ?? firstPick.metadata?.position ?? null }
              }
            }

            const existing = map.get(slot)
            if (existing) map.set(slot, { ...existing, record, lastYearFirstPick })
          }
        }
      } catch {
        // History is a nice-to-have; leave whatever partial map we built.
      }
      if (!cancelled) setHistory(map)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [leagueId, draftOrder, players])

  return history
}
