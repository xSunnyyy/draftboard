import { teamLabel } from '../lib/draftEngine'
import type { Draft } from '../types'

interface Props {
  draft: Draft
  currentIndex: number
}

export function OnClockBanner({ draft, currentIndex }: Props) {
  const current = draft.picks[currentIndex]
  const upNext = draft.picks.slice(currentIndex + 1, currentIndex + 6)

  if (!current) {
    return (
      <div className="onclock">
        <span className="onclock__live">
          <span className="onclock__live-dot" style={{ background: 'var(--success)' }} />
          Draft complete
        </span>
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
    </div>
  )
}
