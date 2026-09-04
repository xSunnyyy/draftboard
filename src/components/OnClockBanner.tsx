import { XIcon } from '@phosphor-icons/react'
import { teamLabel } from '../lib/draftEngine'
import type { Draft } from '../types'

interface Props {
  draft: Draft
  currentIndex: number
  onExitTv?: () => void
}

export function OnClockBanner({ draft, currentIndex, onExitTv }: Props) {
  const current = draft.picks[currentIndex]
  const upNext = draft.picks.slice(currentIndex + 1, currentIndex + 6)

  if (!current) {
    return (
      <div className="onclock">
        <span className="onclock__live">
          <span className="onclock__live-dot" style={{ background: 'var(--success)' }} />
          Draft complete
        </span>
        {onExitTv && (
          <button className="btn btn--ghost" style={{ marginLeft: 'auto' }} onClick={onExitTv}>
            <XIcon size={16} weight="bold" />
            Exit TV mode
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="onclock">
      <span className="onclock__live">
        <span className="onclock__live-dot" />
        On the clock
      </span>
      <span className="onclock__pick">{teamLabel(draft, current.slot)}</span>
      <span className="onclock__meta">
        Pick {current.overallPick} · Round {current.round}, Slot {current.pickInRound}
      </span>
      {upNext.length > 0 && (
        <div className="onclock__upnext">
          <span className="onclock__upnext-label">Up next</span>
          {upNext.map((p) => (
            <span key={p.overallPick} className="upnext-chip">
              {p.overallPick} · {teamLabel(draft, p.slot)}
            </span>
          ))}
        </div>
      )}
      {onExitTv && (
        <button className="btn btn--ghost btn--icon" title="Exit TV mode" onClick={onExitTv}>
          <XIcon size={16} weight="bold" />
        </button>
      )}
    </div>
  )
}
