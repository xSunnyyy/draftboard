import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { teamLabel } from '../lib/draftEngine'
import { buildDraftRecap } from '../lib/recap'
import { PlayerAvatar } from './PlayerAvatar'
import type { Draft, SleeperPlayer } from '../types'

interface Props {
  draft: Draft
  players: Record<string, SleeperPlayer>
  complete: boolean
  onClose: () => void
  onExportCsv: () => void
}

export function DraftRecap({ draft, players, complete, onClose, onExportCsv }: Props) {
  const recap = buildDraftRecap(draft, players)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide recap" onClick={(e) => e.stopPropagation()}>
        <div className="recap__eyebrow">Draft Night</div>
        <h2 className="recap__title">{complete ? 'Draft complete' : 'Recap so far'}</h2>
        <p className="muted">
          {recap.totalPicks} picks{recap.durationLabel ? ` · ${recap.durationLabel}` : ''}
        </p>

        {(recap.biggestSteal || recap.biggestReach) && (
          <div className="recap__awards">
            {recap.biggestSteal && (
              <div className="recap__award recap__award--steal">
                <div className="recap__award-label">Biggest steal</div>
                <PlayerAvatar
                  playerId={recap.biggestSteal.pick.playerId}
                  position={recap.biggestSteal.pick.position}
                  name={recap.biggestSteal.pick.playerName}
                  size={56}
                  thumb
                />
                <div className="recap__award-player">{recap.biggestSteal.pick.playerName}</div>
                <div className="recap__award-meta">
                  Pick {recap.biggestSteal.pick.overallPick} · {teamLabel(draft, recap.biggestSteal.pick.slot)}
                </div>
                <div className="recap__award-detail">
                  Ranked #{recap.biggestSteal.rank} — fell {recap.biggestSteal.valueDelta} picks
                </div>
              </div>
            )}
            {recap.biggestReach && (
              <div className="recap__award recap__award--reach">
                <div className="recap__award-label">Biggest reach</div>
                <PlayerAvatar
                  playerId={recap.biggestReach.pick.playerId}
                  position={recap.biggestReach.pick.position}
                  name={recap.biggestReach.pick.playerName}
                  size={56}
                  thumb
                />
                <div className="recap__award-player">{recap.biggestReach.pick.playerName}</div>
                <div className="recap__award-meta">
                  Pick {recap.biggestReach.pick.overallPick} · {teamLabel(draft, recap.biggestReach.pick.slot)}
                </div>
                <div className="recap__award-detail">
                  Ranked #{recap.biggestReach.rank} — taken {Math.abs(recap.biggestReach.valueDelta)} picks early
                </div>
              </div>
            )}
          </div>
        )}

        {(recap.bestValueTeam || recap.worstValueTeam) && (
          <div className="recap__teams">
            {recap.bestValueTeam && (
              <div className="recap__team-award">
                <span className="tag recap__team-tag recap__team-tag--good">Best value</span>
                <span>{recap.bestValueTeam.teamName}</span>
              </div>
            )}
            {recap.worstValueTeam && (
              <div className="recap__team-award">
                <span className="tag recap__team-tag recap__team-tag--bad">Most reaches</span>
                <span>{recap.worstValueTeam.teamName}</span>
              </div>
            )}
          </div>
        )}

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onExportCsv}>
            <DownloadSimpleIcon size={16} weight="bold" />
            Download results as CSV
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
