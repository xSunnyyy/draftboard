import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowUUpLeftIcon,
  ChartBarIcon,
  CornersOutIcon,
  DownloadSimpleIcon,
  QuestionIcon,
  SpeakerHighIcon,
  SpeakerXIcon,
  TelevisionSimpleIcon,
  TrashIcon,
  TrophyIcon,
} from '@phosphor-icons/react'
import { useSleeperSync } from '../hooks/useSleeperSync'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useClockTick, pauseClock, resetClock, resumeClock, secondsRemaining, startClock } from '../hooks/useDraftClock'
import { useAvailableVoices } from '../hooks/useVoices'
import { useLeagueHistory } from '../hooks/useLeagueHistory'
import { currentPickIndex, draftToCsv, isDraftComplete } from '../lib/draftEngine'
import { buildDraftRecap } from '../lib/recap'
import {
  announcePick,
  cancelSpeech,
  getPreferredVoice,
  getVoiceEnabled,
  isVoiceSupported,
  setPreferredVoiceUri,
  setVoiceEnabled,
} from '../lib/voice'
import { DraftGrid } from './DraftGrid'
import { DraftRecap } from './DraftRecap'
import { OnClockBanner } from './OnClockBanner'
import { OnClockTakeover } from './OnClockTakeover'
import { PickAnnouncement } from './PickAnnouncement'
import { WaitingForDraft } from './WaitingForDraft'
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
  const [showRecap, setShowRecap] = useState(false)
  const recapShownRef = useRef(false)
  const [editingPick, setEditingPick] = useState<number | null>(null)
  const [followLive, setFollowLive] = useState(true)
  const [announcement, setAnnouncement] = useState<DraftPick | null>(null)
  const [pickStartedAt, setPickStartedAt] = useState(() => Date.now())
  const [voiceEnabled, setVoiceEnabledState] = useState(() => getVoiceEnabled())
  const [voiceUri, setVoiceUri] = useState('')
  const availableVoices = useAvailableVoices()
  const prevPicksRef = useRef(draft.picks)
  const searchRef = useRef<HTMLInputElement>(null)
  const now = useClockTick()

  useEffect(() => cancelSpeech, [])

  useEffect(() => {
    if (availableVoices.length === 0) return
    const current = getPreferredVoice()
    if (current) setVoiceUri(current.voiceURI)
  }, [availableVoices])

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

  // On a TV, there's no one at a keyboard to press "TV mode" — once Sleeper says the
  // draft is live, take over the whole screen automatically. Only fires on the actual
  // transition (or once, if it's already live when this screen is first opened), so a
  // manual exit afterward sticks instead of being fought every poll.
  useEffect(() => {
    if (isSleeper && sync.draftStatus === 'drafting') setTvMode(true)
  }, [isSleeper, sync.draftStatus])

  const showWaitingScreen = isSleeper && sync.draftStatus === 'pre_draft'

  const history = useLeagueHistory(isSleeper ? draft.sleeperLeagueId : null, sync.draftOrder, players)

  const currentIndex = currentPickIndex(draft.picks)
  const currentPick = draft.picks[currentIndex]
  const complete = isDraftComplete(draft.picks)
  const editingAllowed = !isSleeper && (!complete || draft.allowEditsWhenComplete)
  const draftedIds = useMemo(
    () => new Set(draft.picks.filter((p) => p.playerId).map((p) => p.playerId as string)),
    [draft.picks],
  )
  const recap = useMemo(() => buildDraftRecap(draft, players), [draft, players])

  // Surface the recap automatically the moment the draft wraps, without fighting a
  // manual close afterward (only fires once per draft, on the actual transition).
  useEffect(() => {
    if (complete && !recapShownRef.current) {
      recapShownRef.current = true
      setShowRecap(true)
    }
  }, [complete])

  // Announce whichever pick most recently landed, from sync or a local manual pick.
  useEffect(() => {
    const prev = prevPicksRef.current
    if (prev !== draft.picks) {
      const prevByPick = new Map(prev.map((p) => [p.overallPick, p]))
      let landed: DraftPick | null = null
      for (const p of draft.picks) {
        const prevPick = prevByPick.get(p.overallPick)
        if (prevPick && !prevPick.playerId && p.playerId) {
          if (!landed || p.overallPick > landed.overallPick) landed = p
        }
      }
      if (landed) {
        setAnnouncement(landed)
        const nextIndex = currentPickIndex(draft.picks)
        announcePick(draft, landed, draft.picks[nextIndex] ?? null, history, recap)
      }
      prevPicksRef.current = draft.picks
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, draft.picks])

  // The Sleeper-synced clock is a client-side approximation: it resets whenever a new
  // pick becomes current, rather than reading a per-pick timestamp Sleeper's public API
  // doesn't expose.
  useEffect(() => {
    if (isSleeper) setPickStartedAt(Date.now())
  }, [currentIndex, isSleeper])

  const sleeperRemaining = useMemo(() => {
    if (draft.settings.timerSeconds <= 0) return null
    const elapsed = Math.floor((now - pickStartedAt) / 1000)
    return Math.max(0, draft.settings.timerSeconds - elapsed)
  }, [now, pickStartedAt, draft.settings.timerSeconds])

  const remainingSeconds = isSleeper ? sleeperRemaining : secondsRemaining(draft.clock, now)

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

  function toggleVoice() {
    const next = !voiceEnabled
    setVoiceEnabled(next)
    setVoiceEnabledState(next)
  }

  function changeVoice(uri: string) {
    setPreferredVoiceUri(uri)
    setVoiceUri(uri)
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
        if (announcement) setAnnouncement(null)
        else if (editingPick != null) setEditingPick(null)
        else if (showHelp) setShowHelp(false)
        else if (showSummary) setShowSummary(false)
        else if (showRecap) setShowRecap(false)
      },
      onToggleHelp: () => setShowHelp((v) => !v),
      onToggleTv: () => setTvMode((v) => !v),
      onToggleFullscreen: toggleFullscreen,
      onUndo: () => !isSleeper && undoLastPick(),
    },
    editingPick == null,
  )

  return (
    <div className={`board ${tvMode ? 'board--tv' : ''}`}>
      {announcement && <PickAnnouncement draft={draft} pick={announcement} onDone={() => setAnnouncement(null)} />}

      {showWaitingScreen ? (
        <WaitingForDraft
          draft={draft}
          connectionStatus={sync.connectionStatus}
          connectionError={sync.error}
          onBack={onBack}
        />
      ) : tvMode ? (
        <OnClockTakeover
          draft={draft}
          currentIndex={currentIndex}
          remainingSeconds={remainingSeconds}
          timerSeconds={draft.settings.timerSeconds}
          history={history}
          onExit={() => setTvMode(false)}
          voiceSupported={isVoiceSupported()}
          voiceEnabled={voiceEnabled}
          onToggleVoice={toggleVoice}
        />
      ) : (
        <>
          <div className="board__toolbar">
            <button className="btn btn--text" onClick={onBack}>
              <ArrowLeftIcon size={17} weight="bold" />
              Library
            </button>
            <StatusBar
              draft={draft}
              connectionStatus={isSleeper ? sync.connectionStatus : null}
              syncError={sync.error}
              sleeperDraftStatus={isSleeper ? sync.draftStatus : null}
            />
            <div className="board__toolbar-actions">
              {!isSleeper && (
                <>
                  <button className="btn btn--text" onClick={undoLastPick} title="Undo last pick">
                    <ArrowUUpLeftIcon size={17} />
                  </button>
                  <button className="btn btn--danger-text" onClick={clearAllPicks} title="Clear all picks">
                    <TrashIcon size={17} />
                  </button>
                </>
              )}
              <button className="btn btn--text" onClick={() => setShowSummary(true)} title="Summary">
                <ChartBarIcon size={17} />
              </button>
              <button className="btn btn--text" onClick={() => setShowRecap(true)} title="Recap">
                <TrophyIcon size={17} />
              </button>
              <button
                className="btn btn--text"
                title="Export CSV"
                onClick={() => downloadCsv(`${draft.name.replace(/\s+/g, '-')}.csv`, draftToCsv(draft))}
              >
                <DownloadSimpleIcon size={17} />
              </button>
              <button className="btn btn--text" onClick={toggleFullscreen} title="Fullscreen">
                <CornersOutIcon size={17} />
              </button>
              {isVoiceSupported() && (
                <button
                  className="btn btn--text"
                  onClick={toggleVoice}
                  title={voiceEnabled ? 'Mute voice announcements' : 'Enable voice announcements'}
                >
                  {voiceEnabled ? <SpeakerHighIcon size={17} /> : <SpeakerXIcon size={17} />}
                </button>
              )}
              {isVoiceSupported() && voiceEnabled && availableVoices.length > 0 && (
                <select
                  className="voice-select"
                  value={voiceUri}
                  onChange={(e) => changeVoice(e.target.value)}
                  title="Voice"
                >
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="board__divider" />
              <button className="btn btn--primary" onClick={() => setTvMode(true)}>
                <TelevisionSimpleIcon size={17} weight="bold" />
                TV mode
              </button>
              <button className="btn btn--text" onClick={() => setShowHelp(true)} title="Keyboard shortcuts">
                <QuestionIcon size={17} />
              </button>
            </div>
          </div>

          <OnClockBanner draft={draft} currentIndex={currentIndex} />

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
                  editable={editingAllowed}
                />
              </div>
            </div>

            <aside className="board__side">
              <ClockPanel
                remainingSeconds={remainingSeconds}
                timerSeconds={draft.settings.timerSeconds}
                clockStatus={draft.clock.status}
                isManual={!isSleeper}
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
              {complete && !isSleeper && (
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
          </div>
        </>
      )}

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
      {showRecap && (
        <DraftRecap
          draft={draft}
          players={players}
          complete={complete}
          onClose={() => setShowRecap(false)}
          onExportCsv={() => downloadCsv(`${draft.name.replace(/\s+/g, '-')}.csv`, draftToCsv(draft))}
        />
      )}
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
