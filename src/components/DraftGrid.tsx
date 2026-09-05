import { useEffect, useRef } from 'react'
import { teamLabel } from '../lib/draftEngine'
import { positionRgb } from '../lib/position'
import type { Draft } from '../types'

interface Props {
  draft: Draft
  currentIndex: number
  onEditPick: (overallPick: number) => void
  followLive: boolean
  editable: boolean
}

export function DraftGrid({ draft, currentIndex, onEditPick, followLive, editable }: Props) {
  const currentCellRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (followLive) {
      currentCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [currentIndex, followLive])

  const teamCount = draft.settings.teamCount
  const rounds = draft.settings.rounds
  const currentPick = draft.picks[currentIndex]

  return (
    <div className="grid" style={{ gridTemplateColumns: `72px repeat(${teamCount}, minmax(140px, 1fr))` }}>
      <div className="grid__corner" />
      {Array.from({ length: teamCount }, (_, i) => i + 1).map((slot) => (
        <div
          key={`head-${slot}`}
          className={`grid__team-head ${currentPick?.slot === slot ? 'grid__team-head--active' : ''}`}
        >
          {teamLabel(draft, slot)}
        </div>
      ))}

      {Array.from({ length: rounds }, (_, r) => r + 1).map((round) => (
        <RowFragment
          key={round}
          round={round}
          teamCount={teamCount}
          draft={draft}
          currentIndex={currentIndex}
          onEditPick={onEditPick}
          currentCellRef={currentCellRef}
          editable={editable}
        />
      ))}
    </div>
  )
}

function RowFragment({
  round,
  teamCount,
  draft,
  currentIndex,
  onEditPick,
  currentCellRef,
  editable,
}: {
  round: number
  teamCount: number
  draft: Draft
  currentIndex: number
  onEditPick: (overallPick: number) => void
  currentCellRef: React.MutableRefObject<HTMLDivElement | null>
  editable: boolean
}) {
  // Column position must follow the team's slot, not the order picks landed in this
  // round — on a snake draft's reversed (even) rounds those are different things, and
  // rendering by array position instead of slot put picks under the wrong team header.
  const bySlot = new Map(draft.picks.filter((p) => p.round === round).map((p) => [p.slot, p]))
  return (
    <>
      <div className="grid__round-label">R{round}</div>
      {Array.from({ length: teamCount }, (_, i) => i + 1).map((slot) => {
        const pick = bySlot.get(slot)
        if (!pick) return <div key={`empty-${round}-${slot}`} className="pick-cell" />
        const globalIndex = pick.overallPick - 1
        const isCurrent = globalIndex === currentIndex
        const isPast = pick.playerId !== null
        return (
          <div
            key={pick.overallPick}
            ref={isCurrent ? currentCellRef : undefined}
            className={`pick-cell ${isCurrent ? 'pick-cell--current' : ''} ${isPast && editable ? 'pick-cell--filled' : ''}`}
            style={{ '--pc': positionRgb(pick.position) } as React.CSSProperties}
            onClick={() => isPast && editable && onEditPick(pick.overallPick)}
          >
            <div className="pick-cell__num">{pick.overallPick}</div>
            {pick.playerId ? (
              <>
                <div className="pick-cell__player">{pick.playerName}</div>
                <div className="pick-cell__meta">
                  {pick.position && <span className="position-chip">{pick.position}</span>}
                  {pick.nflTeam ?? ''}
                </div>
              </>
            ) : isCurrent ? (
              <div className="pick-cell__onclock">On the clock</div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
