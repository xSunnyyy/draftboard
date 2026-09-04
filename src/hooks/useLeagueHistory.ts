import { useEffect, useRef, useState } from 'react'
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
 *
 * Fetches once per league. `draftOrder` and `players` come from a poller
 * that hands back a fresh object identity on every tick even when the
 * content is unchanged, so they're read via ref rather than depended on —
 * otherwise this five-request chain would restart on every 3s poll, and a
 * single failed restart (e.g. rate-limited by all that redundant traffic)
 * would silently stomp a previously-successful result with an empty one.
 */
export function useLeagueHistory(
  leagueId: string | null,
  draftOrder: Record<string, number> | null,
  players: Record<string, SleeperPlayer>,
): Map<number, TeamHistory> {
  const [history, setHistory] = useState<Map<number, TeamHistory>>(new Map())
  const draftOrderRef = useRef(draftOrder)
  draftOrderRef.current = draftOrder
  const playersRef = useRef(players)
  playersRef.current = players
  const fetchedForLeagueRef = useRef<string | null>(null)

  useEffect(() => {
    if (!leagueId || !draftOrder) return
    if (fetchedForLeagueRef.current === leagueId) return
    fetchedForLeagueRef.current = leagueId

    let cancelled = false

    async function run() {
      const order = draftOrderRef.current!
      const map = new Map<number, TeamHistory>()
      try {
        const [league, users] = await Promise.all([sleeper.getLeague(leagueId!), sleeper.getLeagueUsers(leagueId!)])
        const usersById = new Map(users.map((u) => [u.user_id, u]))

        for (const [userId, slot] of Object.entries(order)) {
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

          const players = playersRef.current
          for (const [userId, slot] of Object.entries(order)) {
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
        // History is a nice-to-have; keep whatever partial map we built
        // (e.g. avatars resolved fine but the previous-season lookup failed).
      }
      if (!cancelled) setHistory(map)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [leagueId, draftOrder])

  return history
}
