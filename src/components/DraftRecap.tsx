import { useMemo } from 'react'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { teamLabel } from '../lib/draftEngine'
import { buildDraftRecap, formatSecondsShort } from '../lib/recap'
import { positionRgb } from '../lib/position'
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
  const recap = useMemo(() => buildDraftRecap(draft, players), [draft, players])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide modal--recap recap" onClick={(e) => e.stopPropagation()}>
        <div className="recap__eyebrow">Draft Night</div>
        <h2 className="recap__title">{complete ? 'Draft complete' : 'Recap so far'}</h2>
        <p className="muted">
          {recap.totalPicks} picks{recap.durationLabel ? ` · ${recap.durationLabel}` : ''}
          {recap.avgPickSeconds != null ? ` · ${formatSecondsShort(recap.avgPickSeconds)} avg per pick` : ''}
        </p>

        {(recap.biggestSteal || recap.biggestReach || recap.slowestPick || recap.fastestPick) && (
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
            {recap.slowestPick && (
              <div className="recap__award recap__award--slow">
                <div className="recap__award-label">Longest to decide</div>
                <PlayerAvatar
                  playerId={recap.slowestPick.pick.playerId}
                  position={recap.slowestPick.pick.position}
                  name={recap.slowestPick.pick.playerName}
                  size={56}
                  thumb
                />
                <div className="recap__award-player">{teamLabel(draft, recap.slowestPick.pick.slot)}</div>
                <div className="recap__award-meta">
                  Pick {recap.slowestPick.pick.overallPick} · {recap.slowestPick.pick.playerName}
                </div>
                <div className="recap__award-detail">Took {formatSecondsShort(recap.slowestPick.seconds)}</div>
              </div>
            )}
            {recap.fastestPick && (
              <div className="recap__award recap__award--fast">
                <div className="recap__award-label">Quickest trigger</div>
                <PlayerAvatar
                  playerId={recap.fastestPick.pick.playerId}
                  position={recap.fastestPick.pick.position}
                  name={recap.fastestPick.pick.playerName}
                  size={56}
                  thumb
                />
                <div className="recap__award-player">{teamLabel(draft, recap.fastestPick.pick.slot)}</div>
                <div className="recap__award-meta">
                  Pick {recap.fastestPick.pick.overallPick} · {recap.fastestPick.pick.playerName}
                </div>
                <div className="recap__award-detail">Just {formatSecondsShort(recap.fastestPick.seconds)}</div>
              </div>
            )}
          </div>
        )}

        {recap.positionHoarder && (
          <div className="recap__callout">
            <strong>{recap.positionHoarder.teamName}</strong> went all-in at {recap.positionHoarder.position} —{' '}
            {recap.positionHoarder.count} of them drafted.
          </div>
        )}

        {recap.positionalStandouts.length > 0 && (
          <section className="recap__section">
            <h3 className="recap__section-title">Best value by position</h3>
            <div className="recap__chip-row">
              {recap.positionalStandouts.map(({ position, best }) => (
                <div key={position} className="recap__pos-chip" style={{ '--pc': positionRgb(position) } as React.CSSProperties}>
                  <span className="position-chip" style={{ '--pc': positionRgb(position) } as React.CSSProperties}>
                    {position}
                  </span>
                  <div className="recap__pos-chip-body">
                    <div className="recap__pos-chip-player">{best.pick.playerName}</div>
                    <div className="recap__pos-chip-meta">
                      {teamLabel(draft, best.pick.slot)} · fell {best.valueDelta > 0 ? best.valueDelta : 0} picks
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {recap.firstByPosition.length > 0 && (
          <section className="recap__section">
            <h3 className="recap__section-title">First off the board</h3>
            <div className="recap__chip-row">
              {recap.firstByPosition.map(({ position, pick }) => (
                <div key={position} className="recap__pos-chip" style={{ '--pc': positionRgb(position) } as React.CSSProperties}>
                  <span className="position-chip" style={{ '--pc': positionRgb(position) } as React.CSSProperties}>
                    {position}
                  </span>
                  <div className="recap__pos-chip-body">
                    <div className="recap__pos-chip-player">{pick.playerName}</div>
                    <div className="recap__pos-chip-meta">
                      Pick {pick.overallPick} · {teamLabel(draft, pick.slot)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {recap.teamReports.length > 0 && (
          <section className="recap__section">
            <h3 className="recap__section-title">Draft grades</h3>
            <p className="muted recap__section-hint">How each team's picks compared to expected value.</p>
            <div className="table-scroll">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Grade</th>
                    <th>Avg value</th>
                    <th>Best pick</th>
                    <th>Worst pick</th>
                  </tr>
                </thead>
                <tbody>
                  {[...recap.teamReports]
                    .sort((a, b) => b.avgValue - a.avgValue)
                    .map((team) => (
                      <tr key={team.slot}>
                        <td>{team.teamName}</td>
                        <td>
                          <span className={`recap__grade recap__grade--${team.grade[0].toLowerCase()}`}>{team.grade}</span>
                        </td>
                        <td>
                          {team.avgValue > 0 ? '+' : ''}
                          {team.avgValue.toFixed(1)}
                        </td>
                        <td>{team.best ? `${team.best.pick.playerName} (${team.best.valueDelta > 0 ? '+' : ''}${team.best.valueDelta})` : '—'}</td>
                        <td>{team.worst ? `${team.worst.pick.playerName} (${team.worst.valueDelta > 0 ? '+' : ''}${team.worst.valueDelta})` : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {recap.powerRankings.length > 0 && (
          <section className="recap__section">
            <h3 className="recap__section-title">Way-too-early power rankings</h3>
            <p className="muted recap__section-hint">
              A projected finish order from estimated starting-lineup strength — just for fun, not a real forecast.
            </p>
            <div className="table-scroll">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Power score</th>
                    <th>Outlook</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.powerRankings.map((team) => (
                    <tr key={team.slot}>
                      <td>{team.rank}</td>
                      <td>{team.teamName}</td>
                      <td>{team.powerScore}</td>
                      <td>
                        <span className={`tag recap__tier recap__tier--${team.tier.split(' ')[0].toLowerCase()}`}>{team.tier}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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
