import { useMemo, useState } from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import { teamLabel } from '../lib/draftEngine'
import { positionRgb } from '../lib/position'
import type { Draft, SleeperPlayer } from '../types'

interface Props {
  draft: Draft
  overallPick: number
  players: Record<string, SleeperPlayer>
  onClose: () => void
  onReplace: (playerId: string) => void
  onClear: () => void
}

export function PickEditDialog({ draft, overallPick, players, onClose, onReplace, onClear }: Props) {
  const pick = draft.picks.find((p) => p.overallPick === overallPick)
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return Object.values(players)
      .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q))
      .sort((a, b) => (a.search_rank ?? 9999) - (b.search_rank ?? 9999))
      .slice(0, 20)
  }, [players, query])

  if (!pick) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit pick {overallPick}</h2>
        <p className="muted">
          Round {pick.round}, Pick {pick.pickInRound} · {teamLabel(draft, pick.slot)}
        </p>

        {pick.playerId && (
          <div className="modal__current">
            Currently: <strong>{pick.playerName}</strong>{' '}
            <span className="position-chip" style={{ '--pc': positionRgb(pick.position) } as React.CSSProperties}>
              {pick.position}
            </span>
          </div>
        )}

        <label className="field">
          <span>Replace with</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player name…"
          />
        </label>

        <ul className="modal__results">
          {results.map((p) => (
            <li key={p.player_id}>
              <button
                className="btn btn--ghost btn--full"
                onClick={() => {
                  onReplace(p.player_id)
                  onClose()
                }}
              >
                {p.first_name} {p.last_name} · {p.position} · {p.team ?? 'FA'}
              </button>
            </li>
          ))}
        </ul>

        <div className="modal__actions">
          <button
            className="btn btn--danger"
            onClick={() => {
              onClear()
              onClose()
            }}
          >
            <TrashIcon size={16} />
            Clear pick
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
