import { XIcon } from '@phosphor-icons/react'
import { teamLabel } from '../lib/draftEngine'
import { PlayerAvatar } from './PlayerAvatar'
import type { Draft } from '../types'

interface Props {
  draft: Draft
  currentIndex: number
  remainingSeconds: number | null
  timerSeconds: number
  onExit: () => void
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function OnClockTakeover({ draft, currentIndex, remainingSeconds, timerSeconds, onExit }: Props) {
  const current = draft.picks[currentIndex]
  const previous = currentIndex > 0 ? draft.picks[currentIndex - 1] : null
  const upNext = draft.picks.slice(currentIndex + 1, currentIndex + 4)
  const pct = remainingSeconds != null && timerSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / timerSeconds)) : 1
  const expired = remainingSeconds === 0

  return (
    <div className="takeover">
      <button className="btn btn--ghost btn--icon takeover__exit" onClick={onExit} title="Exit TV mode">
        <XIcon size={18} weight="bold" />
      </button>

      {!current ? (
        <div className="takeover__main">
          <div className="takeover__team">Draft complete</div>
        </div>
      ) : (
        <>
          <div className="takeover__left">
            <div className="takeover__quadrant">
              <div className="takeover__quadrant-label">Time remaining</div>
              <div
                className={`takeover__clock ${expired ? 'takeover__clock--expired' : ''}`}
                style={{ '--pct': pct } as React.CSSProperties}
              >
                <div className="takeover__clock-inner">{remainingSeconds != null ? formatSeconds(remainingSeconds) : '—:—'}</div>
              </div>
            </div>
            <div className="takeover__quadrant takeover__quadrant--bottom">
              <div className="takeover__quadrant-label">Previous pick</div>
              {previous?.playerId ? (
                <div className="takeover__previous">
                  <PlayerAvatar
                    key={previous.playerId}
                    playerId={previous.playerId}
                    position={previous.position}
                    name={previous.playerName}
                    size={60}
                    thumb
                  />
                  <div className="takeover__previous-text">
                    <div className="takeover__previous-player">{previous.playerName}</div>
                    <div className="takeover__previous-meta">
                      Pick {previous.overallPick} · {teamLabel(draft, previous.slot)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="muted">No picks yet</div>
              )}
            </div>
          </div>

          <div className="takeover__main">
            <div className="takeover__live">
              <span className="onclock__live-dot" />
              On the clock
            </div>
            <div className="takeover__team">{teamLabel(draft, current.slot)}</div>
            <div className="takeover__meta">
              Pick {current.overallPick} · Round {current.round}, Slot {current.pickInRound}
            </div>
            {upNext.length > 0 && (
              <div className="takeover__upnext">
                <span className="onclock__upnext-label">Up next</span>
                {upNext.map((p) => (
                  <span key={p.overallPick} className="upnext-chip">
                    {p.overallPick} · {teamLabel(draft, p.slot)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
