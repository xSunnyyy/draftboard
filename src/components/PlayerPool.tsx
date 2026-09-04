import { forwardRef, useMemo, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { positionRgb } from '../lib/position'
import type { SleeperPlayer } from '../types'

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

interface Props {
  players: Record<string, SleeperPlayer>
  draftedIds: Set<string>
  onDraft: (playerId: string) => void
  canDraft: boolean
}

export const PlayerPool = forwardRef<HTMLInputElement, Props>(function PlayerPool(
  { players, draftedIds, onDraft, canDraft },
  searchRef,
) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('ALL')
  const [availableOnly, setAvailableOnly] = useState(true)
  const [highlighted, setHighlighted] = useState(0)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    let entries = Object.values(players)
    if (availableOnly) entries = entries.filter((p) => !draftedIds.has(p.player_id))
    if (position !== 'ALL') entries = entries.filter((p) => p.position === position)
    if (q) {
      entries = entries.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q))
    }
    entries.sort((a, b) => (a.search_rank ?? 9999) - (b.search_rank ?? 9999))
    return entries.slice(0, 100)
  }, [players, draftedIds, availableOnly, position, query])

  const clampedHighlight = Math.min(highlighted, Math.max(0, list.length - 1))

  function moveHighlight(delta: number) {
    if (!canDraft) return
    setHighlighted((h) => Math.max(0, Math.min(list.length - 1, h + delta)))
  }

  function draftHighlighted() {
    const player = list[clampedHighlight]
    if (player && canDraft) onDraft(player.player_id)
  }

  return (
    <div className="pool">
      <div className="pool__search-row">
        <MagnifyingGlassIcon className="pool__search-icon" size={16} />
        <input
          ref={searchRef}
          className="pool__search"
          placeholder={canDraft ? 'Search names… (press / to focus)' : 'Search names… (reference only)'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlighted(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') draftHighlighted()
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              moveHighlight(1)
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              moveHighlight(-1)
            }
            if (e.key === 'Escape') setQuery('')
          }}
        />
      </div>

      <div className="pool__filters">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            className={`chip ${position === pos ? 'chip--active' : ''}`}
            onClick={() => {
              setPosition(pos)
              setHighlighted(0)
            }}
          >
            {pos}
          </button>
        ))}
        <label className="pool__available-toggle">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
          />
          Available only
        </label>
      </div>

      <ul className="pool__list">
        {list.length === 0 && <li className="muted pool__empty">No players match this filter.</li>}
        {list.map((p, i) => {
          const drafted = draftedIds.has(p.player_id)
          return (
            <li
              key={p.player_id}
              className={`pool__row ${i === clampedHighlight && canDraft ? 'pool__row--highlighted' : ''} ${drafted ? 'pool__row--drafted' : ''} ${!canDraft ? 'pool__row--readonly' : ''}`}
              onClick={() => canDraft && !drafted && onDraft(p.player_id)}
              onMouseEnter={() => canDraft && setHighlighted(i)}
            >
              <span className="pool__rank">{p.search_rank ?? '–'}</span>
              <span className="pool__name">
                {p.first_name} {p.last_name}
              </span>
              <span className="position-chip" style={{ '--pc': positionRgb(p.position) } as React.CSSProperties}>
                {p.position}
              </span>
              <span className="pool__team">{p.team ?? 'FA'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
})
