import { useMemo, useRef, useState } from 'react'
import { useSleeperSync } from '../hooks/useSleeperSync'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useClockTick, pauseClock, resetClock, resumeClock, startClock } from '../hooks/useDraftClock'
import { currentPickIndex, draftToCsv, isDraftComplete } from '../lib/draftEngine'
import { DraftGrid } from './DraftGrid'
import { PlayerPool } from './PlayerPool'
import { PickEditDialog } from './PickEditDialog'
import { ShortcutsHelp } from './ShortcutsHelp'
import { SummaryPanel } from './SummaryPanel'
import { ClockPanel } from './ClockPanel'
import { StatusBar } from './StatusBar'
import type { Draft, DraftPick, SleeperPlayer } from '../types'

interface Props {
  draft: Draft
  players: Record<string, SleeperPlayer>
  onUpdate: (draft: Draft) => void
  onBack: () => void
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function BoardView({ draft, players, onUpdate, onBack }: Props) {
  const [tvMode, setTvMode] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [editingPick, setEditingPick] = useState<number | null>(null)
  const [followLive, setFollowLive] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const now = useClockTick()

  const isSleeper = draft.source === 'sleeper'

  function applyPicks(picks: DraftPick[], statusOverride?: Draft['status']) {
    const complete = isDraftComplete(picks)
    onUpdate({
      ...draft,
      picks,
      status: statusOverride ?? (complete ? 'complete' : draft.status === 'setup' ? 'active' : draft.status),
    })
  }

  const sync = useSleeperSync(draft, (picks) => {
    const statusMap: Record<string, Draft['status']> = {
      pre_draft: 'setup',
      drafting: 'active',
      paused: 'paused',
      complete: 'complete',
    }
    applyPicks(picks, sync.draftStatus ? statusMap[sync.draftStatus] : undefined)
  })

  const currentIndex = currentPickIndex(draft.picks)
  const currentPick = draft.picks[currentIndex]
  const complete = isDraftComplete(draft.picks)
  const editingAllowed = !complete || draft.allowEditsWhenComplete
  const draftedIds = useMemo(
    () => new Set(draft.picks.filter((p) => p.playerId).map((p) => p.playerId as string)),
    [draft.picks],
  )

  function draftPlayer(playerId: string) {
    if (!currentPick || currentPick.playerId) return
    const player = players[playerId]
    if (!player) return
    const picks = draft.picks.map((p) =>
      p.overallPick === currentPick.overallPick
        ? {
            ...p,
            playerId,
            playerName: `${player.first_name} ${player.last_name}`.trim(),
            position: player.position,
            nflTeam: player.team,
            pickedAt: Date.now(),
            isManualEdit: true,
          }
        : p,
    )
    applyPicks(picks)
  }

  function undoLastPick() {
    const filled = [...draft.picks].filter((p) => p.playerId).sort((a, b) => b.overallPick - a.overallPick)
    const last = filled[0]
    if (!last) return
    const picks = draft.picks.map((p) =>
      p.overallPick === last.overallPick
        ? { ...p, playerId: null, playerName: null, position: null, nflTeam: null, pickedAt: null, isManualEdit: false }
        : p,
    )
    applyPicks(picks)
  }

  function clearAllPicks() {
    if (!confirm('Clear all picks in this draft?')) return
    const picks = draft.picks.map((p) => ({
      ...p,
      playerId: null,
      playerName: null,
      position: null,
      nflTeam: null,
      pickedAt: null,
      isManualEdit: false,
    }))
    applyPicks(picks, 'active')
  }

  function replacePick(overallPick: number, playerId: string) {
    const player = players[playerId]
    if (!player) return
    const picks = draft.picks.map((p) =>
      p.overallPick === overallPick
        ? {
            ...p,
            playerId,
            playerName: `${player.first_name} ${player.last_name}`.trim(),
            position: player.position,
            nflTeam: player.team,
            pickedAt: Date.now(),
            isManualEdit: true,
          }
        : p,
    )
    applyPicks(picks)
  }

  function clearPick(overallPick: number) {
    const picks = draft.picks.map((p) =>
      p.overallPick === overallPick
        ? { ...p, playerId: null, playerName: null, position: null, nflTeam: null, pickedAt: null, isManualEdit: false }
        : p,
    )
    applyPicks(picks)
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  useKeyboardShortcuts(
    {
      onFocusSearch: () => searchRef.current?.focus(),
      onEscape: () => {
        if (editingPick != null) setEditingPick(null)
        else if (showHelp) setShowHelp(false)
        else if (showSummary) setShowSummary(false)
      },
      onToggleHelp: () => setShowHelp((v) => !v),
      onToggleTv: () => setTvMode((v) => !v),
      onToggleFullscreen: toggleFullscreen,
      onUndo: undoLastPick,
    },
    editingPick == null,
  )

  return (
    <div className={`board ${tvMode ? 'board--tv' : ''}`}>
      {!tvMode && (
        <div className="board__toolbar">
          <button className="btn btn--ghost" onClick={onBack}>
            ← Library
          </button>
          <StatusBar
            draft={draft}
            connectionStatus={isSleeper ? sync.connectionStatus : null}
            syncError={sync.error}
            sleeperDraftStatus={isSleeper ? sync.draftStatus : null}
          />
          <div className="board__toolbar-actions">
            <button className="btn btn--ghost" onClick={undoLastPick}>
              Undo last pick
            </button>
            <button className="btn btn--ghost btn--danger" onClick={clearAllPicks}>
              Clear all picks
            </button>
            <button className="btn btn--ghost" onClick={() => setShowSummary(true)}>
              Summary
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => downloadCsv(`${draft.name.replace(/\s+/g, '-')}.csv`, draftToCsv(draft))}
            >
              Export CSV
            </button>
            <button className="btn btn--ghost" onClick={toggleFullscreen}>
              Fullscreen
            </button>
            <button className="btn btn--primary" onClick={() => setTvMode(true)}>
              TV mode
            </button>
            <button className="btn btn--ghost" onClick={() => setShowHelp(true)}>
              ?
            </button>
          </div>
        </div>
      )}

      {tvMode && (
        <div className="board__tv-bar">
          <span className="board__tv-name">{draft.name}</span>
          {currentPick && (
            <span className="board__tv-onclock">
              On the clock: Pick {currentPick.overallPick}
            </span>
          )}
          <button className="btn btn--ghost" onClick={() => setTvMode(false)}>
            Exit TV mode
          </button>
        </div>
      )}

      <div className="board__body">
        <div className="board__grid-wrap">
          {!followLive && (
            <button className="btn btn--primary board__jump-live" onClick={() => setFollowLive(true)}>
              Back to live pick
            </button>
          )}
          <div
            className="board__grid-scroll"
            onWheel={() => setFollowLive(false)}
            onTouchMove={() => setFollowLive(false)}
          >
            <DraftGrid
              draft={draft}
              currentIndex={currentIndex}
              onEditPick={(overallPick) => editingAllowed && setEditingPick(overallPick)}
              followLive={followLive}
            />
          </div>
        </div>

        {!tvMode && (
          <aside className="board__side">
            <ClockPanel
              clock={draft.clock}
              now={now}
              isManual={draft.source === 'manual'}
              onStart={() => onUpdate({ ...draft, clock: startClock(draft.settings.timerSeconds) })}
              onPause={() => onUpdate({ ...draft, clock: pauseClock(draft.clock, now) })}
              onResume={() => onUpdate({ ...draft, clock: resumeClock(draft.clock) })}
              onReset={() => onUpdate({ ...draft, clock: resetClock(draft.settings.timerSeconds) })}
            />
            <PlayerPool
              ref={searchRef}
              players={players}
              draftedIds={draftedIds}
              onDraft={draftPlayer}
              canDraft={editingAllowed && !!currentPick && !currentPick.playerId}
            />
            {complete && (
              <label className="pool__available-toggle">
                <input
                  type="checkbox"
                  checked={draft.allowEditsWhenComplete}
                  onChange={(e) => onUpdate({ ...draft, allowEditsWhenComplete: e.target.checked })}
                />
                Allow edits to this completed draft
              </label>
            )}
          </aside>
        )}
      </div>

      {editingPick != null && (
        <PickEditDialog
          draft={draft}
          overallPick={editingPick}
          players={players}
          onClose={() => setEditingPick(null)}
          onReplace={(playerId) => replacePick(editingPick, playerId)}
          onClear={() => clearPick(editingPick)}
        />
      )}
      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
      {showSummary && (
        <SummaryPanel
          draft={draft}
          onClose={() => setShowSummary(false)}
          onExportCsv={() => downloadCsv(`${draft.name.replace(/\s+/g, '-')}.csv`, draftToCsv(draft))}
        />
      )}
    </div>
  )
}
