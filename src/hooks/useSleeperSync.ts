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
}

const POLL_MS = 3000

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

        const merged = draft!.picks.map((pick) => {
          const remote = bySlot.get(pick.overallPick)
          if (!remote) return pick.isManualEdit ? pick : { ...pick, playerId: null, playerName: null, position: null, nflTeam: null, pickedAt: null }
          if (pick.isManualEdit) return pick
          const meta = remote.metadata
          const name = meta?.first_name || meta?.last_name ? `${meta?.first_name ?? ''} ${meta?.last_name ?? ''}`.trim() : remote.player_id
          return {
            ...pick,
            playerId: remote.player_id,
            playerName: name,
            position: meta?.position ?? null,
            nflTeam: meta?.team ?? null,
            pickedAt: Date.now(),
          }
        })

        onPicksUpdateRef.current(merged)

        const lastPick = sleeperPicks.length > 0 ? sleeperPicks[sleeperPicks.length - 1] : null
        setState({
          connectionStatus: 'connected',
          draftStatus: sleeperDraft.status,
          error: null,
          pickTimerSeconds: sleeperDraft.settings?.pick_timer ?? null,
          lastPickAt: lastPick ? Date.now() : null,
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
