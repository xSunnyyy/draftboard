import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftIcon, SpeakerHighIcon, SpeakerXIcon } from '@phosphor-icons/react'
import { useSleeperSync } from '../hooks/useSleeperSync'
import { useLeagueHistory } from '../hooks/useLeagueHistory'
import { useAvailableVoices } from '../hooks/useVoices'
import { buildEmptyPicks, currentPickIndex, teamLabel } from '../lib/draftEngine'
import { newId } from '../lib/id'
import { buildDraftRecap } from '../lib/recap'
import { resolveSleeperDraft } from '../lib/resolveSleeperDraft'
import {
  announcePick,
  getPreferredVoice,
  getVoiceEnabled,
  isVoiceSupported,
  setPreferredVoiceUri,
  setVoiceEnabled,
} from '../lib/voice'
import type { Draft, DraftPick, DraftSettings, SleeperPlayer } from '../types'

interface Props {
  companionId: string
  players: Record<string, SleeperPlayer>
  onExit: () => void
}

function defaultSettings(): DraftSettings {
  return {
    teamCount: 10,
    teamNames: Array.from({ length: 10 }, (_, i) => `Team ${i + 1}`),
    draftType: 'snake',
    scoring: 'ppr',
    rounds: 15,
    timerSeconds: 60,
    season: String(new Date().getFullYear()),
  }
}

const MAX_LOG_LINES = 8

/**
 * A lightweight, board-free page: point a phone or tablet at a Sleeper draft
 * ID and it polls + speaks pick announcements and roasts, without needing to
 * render (or even see) the visual board. Exists because some TV browsers
 * (Samsung Tizen among them) expose `speechSynthesis` but never actually
 * produce audio — this runs on a second device instead.
 */
export function VoiceCompanion({ companionId, players, onExit }: Props) {
  const [resolving, setResolving] = useState(true)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [voiceEnabled, setVoiceEnabledState] = useState(() => getVoiceEnabled())
  const [voiceUri, setVoiceUri] = useState('')
  const [log, setLog] = useState<string[]>([])
  const availableVoices = useAvailableVoices()
  const prevPicksRef = useRef<DraftPick[] | null>(null)
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)

  useEffect(() => {
    let cancelled = false
    setResolving(true)
    setResolveError(null)
    resolveSleeperDraft(companionId, defaultSettings())
      .then(({ draftId, leagueId, name, settings }) => {
        if (cancelled) return
        const now = Date.now()
        setDraft({
          id: newId(),
          name,
          source: 'sleeper',
          sleeperDraftId: draftId,
          sleeperLeagueId: leagueId,
          status: 'active',
          archived: false,
          allowEditsWhenComplete: false,
          settings,
          picks: buildEmptyPicks(settings),
          clock: { status: 'stopped', deadline: null, remainingWhenPaused: null },
          createdAt: now,
          updatedAt: now,
        })
      })
      .catch((e) => {
        if (!cancelled) setResolveError(e instanceof Error ? e.message : 'Could not connect to that Sleeper draft.')
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })
    return () => {
      cancelled = true
    }
  }, [companionId])

  useEffect(() => {
    if (availableVoices.length === 0) return
    const current = getPreferredVoice()
    if (current) setVoiceUri(current.voiceURI)
  }, [availableVoices])

  // Keep the screen awake where supported — this device has to stay on and
  // polling for the companion mode to be any use.
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let released = false
    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        if (released) {
          void lock.release()
          return
        }
        wakeLockRef.current = lock
      })
      .catch(() => {})
    return () => {
      released = true
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])

  const sync = useSleeperSync(draft, (picks) => {
    setDraft((d) => (d ? { ...d, picks } : d))
  })

  const history = useLeagueHistory(draft?.sleeperLeagueId ?? null, sync.draftOrder, players)
  const recap = useMemo(() => (draft ? buildDraftRecap(draft, players) : null), [draft, players])

  useEffect(() => {
    if (!draft) return
    const prev = prevPicksRef.current
    if (prev && prev !== draft.picks) {
      const prevByPick = new Map(prev.map((p) => [p.overallPick, p]))
      let landed: DraftPick | null = null
      for (const p of draft.picks) {
        const prevPick = prevByPick.get(p.overallPick)
        if (prevPick && !prevPick.playerId && p.playerId) {
          if (!landed || p.overallPick > landed.overallPick) landed = p
        }
      }
      if (landed) {
        const nextIndex = currentPickIndex(draft.picks)
        announcePick(draft, landed, draft.picks[nextIndex] ?? null, history, recap ?? undefined, (line) =>
          setLog((l) => [line, ...l].slice(0, MAX_LOG_LINES)),
        )
      }
    }
    prevPicksRef.current = draft.picks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  function toggleVoice() {
    const next = !voiceEnabled
    setVoiceEnabled(next)
    setVoiceEnabledState(next)
  }

  function changeVoice(uri: string) {
    setPreferredVoiceUri(uri)
    setVoiceUri(uri)
  }

  if (resolving) {
    return (
      <div className="companion">
        <div className="companion__body">
          <span className="status-dot status-dot--connecting" />
          <p className="companion__sub">Connecting to Sleeper…</p>
        </div>
      </div>
    )
  }

  if (resolveError || !draft) {
    return (
      <div className="companion">
        <button className="btn btn--text companion__back" onClick={onExit}>
          <ArrowLeftIcon size={16} weight="bold" />
          Draft Night
        </button>
        <div className="companion__body">
          <p className="error-text">{resolveError || 'Could not load this draft.'}</p>
        </div>
      </div>
    )
  }

  const currentIndex = currentPickIndex(draft.picks)
  const currentPick = draft.picks[currentIndex]
  const complete = currentIndex >= draft.picks.length

  return (
    <div className="companion">
      <button className="btn btn--text companion__back" onClick={onExit}>
        <ArrowLeftIcon size={16} weight="bold" />
        Draft Night
      </button>

      <div className="companion__body">
        <span className={`status-dot status-dot--${sync.connectionStatus}`} />
        <div className="companion__eyebrow">Voice companion</div>
        <h1 className="companion__title">{draft.name}</h1>
        <p className="companion__sub">
          {complete
            ? 'Draft complete.'
            : currentPick
              ? `On the clock: ${teamLabel(draft, currentPick.slot)}`
              : 'Waiting for the draft to start…'}
        </p>

        {!isVoiceSupported() ? (
          <p className="error-text">This browser has no speech support either — try a different device.</p>
        ) : (
          <>
            <button className="btn btn--primary btn--large" onClick={toggleVoice}>
              {voiceEnabled ? <SpeakerHighIcon size={18} weight="bold" /> : <SpeakerXIcon size={18} weight="bold" />}
              {voiceEnabled ? 'Voice on' : 'Voice muted'}
            </button>
            {voiceEnabled && availableVoices.length > 0 && (
              <select className="voice-select" value={voiceUri} onChange={(e) => changeVoice(e.target.value)}>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        <div className="companion__hint">Keep this screen unlocked — it has to stay open to keep talking.</div>

        {log.length > 0 && (
          <ul className="companion__log">
            {log.map((line, i) => (
              <li key={i} className={i === 0 ? 'companion__log-line companion__log-line--latest' : 'companion__log-line'}>
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
