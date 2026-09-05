import { useEffect, useRef, useState } from 'react'
import * as sleeper from '../lib/sleeper'
import type { Draft, DraftPick, SleeperDraft } from '../types'

export type SleeperConnectionStatus = 'idle' | 'connecting' | 'connected' | 'offline' | 'error'

export interface SleeperSyncState {
  connectionStatus: SleeperConnectionStatus
  draftStatus: SleeperDraft['status'] | null
  error: string | null
  pickTimerSeconds: number | null
  lastPickAt: number | null
  draftOrder: Record<string, number> | null
}

// An unchanged poll is a no-op (no re-render, no storage write — see the `changed`
// guard below), and sleeper.ts's getDraft/getDraftPicks bypass Sleeper's CDN cache, so
// there's no server-side staleness floor left to poll faster than.
const POLL_MS = 1000

/** Polls a Sleeper draft and reconciles picks into the local draft record. */
export function useSleeperSync(
  draft: Draft | null,
  onPicksUpdate: (picks: DraftPick[]) => void,
): SleeperSyncState {
  const [state, setState] = useState<SleeperSyncState>({
    connectionStatus: 'idle',
    draftStatus: null,
    error: null,
    pickTimerSeconds: null,
    lastPickAt: null,
    draftOrder: null,
  })
  const onPicksUpdateRef = useRef(onPicksUpdate)
  onPicksUpdateRef.current = onPicksUpdate

  useEffect(() => {
    if (!draft || draft.source !== 'sleeper' || !draft.sleeperDraftId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      setState((s) => (s.connectionStatus === 'connected' ? s : { ...s, connectionStatus: 'connecting' }))
      try {
        const [sleeperDraft, sleeperPicks] = await Promise.all([
          sleeper.getDraft(draft!.sleeperDraftId!),
          sleeper.getDraftPicks(draft!.sleeperDraftId!),
        ])
        if (cancelled) return

        const bySlot = new Map<number, (typeof sleeperPicks)[number]>()
        for (const p of sleeperPicks) bySlot.set(p.pick_no, p)

        // Most polls see no actual change on Sleeper — only build a new pick object
        // (and only stamp a fresh pickedAt) when something really did change, so an
        // unchanged poll doesn't cascade into a re-render + IndexedDB write.
        let changed = false
        const merged = draft!.picks.map((pick) => {
          if (pick.isManualEdit) return pick
          const remote = bySlot.get(pick.overallPick)
          if (!remote) {
            if (pick.playerId === null) return pick
            changed = true
            return { ...pick, playerId: null, playerName: null, position: null, nflTeam: null, pickedAt: null }
          }
          const meta = remote.metadata
          const name = meta?.first_name || meta?.last_name ? `${meta?.first_name ?? ''} ${meta?.last_name ?? ''}`.trim() : remote.player_id
          const position = meta?.position ?? null
          const nflTeam = meta?.team ?? null
          if (pick.playerId === remote.player_id && pick.playerName === name && pick.position === position && pick.nflTeam === nflTeam) {
            return pick
          }
          changed = true
          return { ...pick, playerId: remote.player_id, playerName: name, position, nflTeam, pickedAt: Date.now() }
        })

        if (changed) onPicksUpdateRef.current(merged)

        const lastPick = sleeperPicks.length > 0 ? sleeperPicks[sleeperPicks.length - 1] : null
        setState({
          connectionStatus: 'connected',
          draftStatus: sleeperDraft.status,
          error: null,
          pickTimerSeconds: sleeperDraft.settings?.pick_timer ?? null,
          lastPickAt: lastPick ? Date.now() : null,
          draftOrder: sleeperDraft.draft_order,
        })
      } catch (e) {
        if (cancelled) return
        setState((s) => ({
          ...s,
          connectionStatus: 'offline',
          error: e instanceof sleeper.SleeperError ? e.message : 'Sleeper sync offline',
        }))
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS)
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.sleeperDraftId, draft?.source])

  return state
}
