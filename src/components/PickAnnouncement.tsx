import { useEffect } from 'react'
import { teamLabel } from '../lib/draftEngine'
import { getPickCallout } from '../lib/callouts'
import { positionRgb } from '../lib/position'
import { PlayerAvatar } from './PlayerAvatar'
import type { Draft, DraftPick } from '../types'

interface Props {
  draft: Draft
  pick: DraftPick
  onDone: () => void
}

const DISPLAY_MS = 6000

export function PickAnnouncement({ draft, pick, onDone }: Props) {
  useEffect(() => {
    const id = setTimeout(onDone, DISPLAY_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick.overallPick])

  const callout = getPickCallout(draft, pick)

  return (
    <div className="announcement" onClick={onDone}>
      <div className="announcement__card" onClick={(e) => e.stopPropagation()}>
        <div className="announcement__pickno">
          Pick {pick.overallPick} · Round {pick.round}
        </div>
        <div className="announcement__avatar-wrap" style={{ '--pc': positionRgb(pick.position) } as React.CSSProperties}>
          <PlayerAvatar key={pick.playerId} playerId={pick.playerId} position={pick.position} name={pick.playerName} size={224} />
        </div>
        <div className="announcement__team">{teamLabel(draft, pick.slot)} selects</div>
        <div className="announcement__player">{pick.playerName}</div>
        <div className="announcement__meta">
          {pick.position && (
            <span className="position-chip" style={{ '--pc': positionRgb(pick.position) } as React.CSSProperties}>
              {pick.position}
            </span>
          )}
          {pick.nflTeam}
        </div>
        {callout && <div className={`announcement__callout announcement__callout--${callout.tone}`}>{callout.label}</div>}
        <div className="announcement__progress" />
      </div>
    </div>
  )
}
